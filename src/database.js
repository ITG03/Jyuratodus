// Simple IndexedDB database for Weighbridge Analytics
class WeighbridgeDB {
  constructor() {
    this.dbName = 'WeighbridgeDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create People table
        if (!db.objectStoreNames.contains('people')) {
          const peopleStore = db.createObjectStore('people', { keyPath: 'id', autoIncrement: true });
          peopleStore.createIndex('name', 'name', { unique: true });
          peopleStore.createIndex('group', 'group', { unique: false });
          peopleStore.createIndex('shift', 'shift', { unique: false });
        }

        // Create Groups table
        if (!db.objectStoreNames.contains('groups')) {
          const groupsStore = db.createObjectStore('groups', { keyPath: 'id', autoIncrement: true });
          groupsStore.createIndex('name', 'name', { unique: true });
        }

        // Create Shifts table
        if (!db.objectStoreNames.contains('shifts')) {
          const shiftsStore = db.createObjectStore('shifts', { keyPath: 'id', autoIncrement: true });
          shiftsStore.createIndex('name', 'name', { unique: true });
        }

        // Create Excel Data table
        if (!db.objectStoreNames.contains('excelData')) {
          const excelStore = db.createObjectStore('excelData', { keyPath: 'id', autoIncrement: true });
          excelStore.createIndex('uploadDate', 'uploadDate', { unique: false });
        }
      };
    });
  }

  // People operations
  async addPerson(name, group = '', shift = '') {
    const transaction = this.db.transaction(['people'], 'readwrite');
    const store = transaction.objectStore('people');
    
    // Check if person already exists by name
    const existingPeople = await this.getAllPeople();
    const existingPerson = existingPeople.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingPerson) {
      // Person exists, update their group and shift if provided
      if (group || shift) {
        const updates = {};
        if (group) updates.group = group;
        if (shift) updates.shift = shift;
        
        return this.updatePerson(existingPerson.id, updates);
      }
      // Return existing person ID if no updates needed
      return existingPerson.id;
    }
    
    const person = {
      name: name.trim(),
      group: group.trim(),
      shift: shift.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(person);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePerson(id, updates) {
    const transaction = this.db.transaction(['people'], 'readwrite');
    const store = transaction.objectStore('people');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const person = getRequest.result;
        if (person) {
          const updatedPerson = {
            ...person,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          
          const putRequest = store.put(updatedPerson);
          putRequest.onsuccess = () => resolve(putRequest.result);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Person not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deletePerson(id) {
    const transaction = this.db.transaction(['people'], 'readwrite');
    const store = transaction.objectStore('people');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPeople() {
    const transaction = this.db.transaction(['people'], 'readonly');
    const store = transaction.objectStore('people');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPeopleByGroup(group) {
    const transaction = this.db.transaction(['people'], 'readonly');
    const store = transaction.objectStore('people');
    const index = store.index('group');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(group);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPeopleByShift(shift) {
    const transaction = this.db.transaction(['people'], 'readonly');
    const store = transaction.objectStore('people');
    const index = store.index('shift');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(shift);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async findPersonByName(name) {
    const transaction = this.db.transaction(['people'], 'readonly');
    const store = transaction.objectStore('people');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const people = request.result;
        const person = people.find(p => p.name.toLowerCase() === name.toLowerCase());
        resolve(person || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addPersonIfNotExists(name, group = '', shift = '') {
    const existingPerson = await this.findPersonByName(name);
    
    if (existingPerson) {
      // Person exists, only update if new group/shift provided
      const updates = {};
      if (group && group !== existingPerson.group) updates.group = group;
      if (shift && shift !== existingPerson.shift) updates.shift = shift;
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await this.updatePerson(existingPerson.id, updates);
      }
      
      return existingPerson.id;
    } else {
      // Person doesn't exist, create new
      return this.addPerson(name, group, shift);
    }
  }

  async getDuplicateNamesSummary(excelRows) {
    const nameCounts = {};
    const duplicates = [];
    
    // Count occurrences of each name in Excel data
    excelRows.forEach(row => {
      if (row.person) {
        const name = row.person.trim();
        nameCounts[name] = (nameCounts[name] || 0) + 1;
      }
    });
    
    // Find names that appear more than once
    Object.entries(nameCounts).forEach(([name, count]) => {
      if (count > 1) {
        duplicates.push({ name, count });
      }
    });
    
    return {
      totalUniqueNames: Object.keys(nameCounts).length,
      totalNameOccurrences: Object.values(nameCounts).reduce((sum, count) => sum + count, 0),
      duplicateNames: duplicates.sort((a, b) => b.count - a.count),
      hasDuplicates: duplicates.length > 0
    };
  }

  // Groups operations
  async addGroup(name) {
    const transaction = this.db.transaction(['groups'], 'readwrite');
    const store = transaction.objectStore('groups');
    
    const group = {
      name: name.trim(),
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(group);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllGroups() {
    const transaction = this.db.transaction(['groups'], 'readonly');
    const store = transaction.objectStore('groups');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteGroup(id) {
    const transaction = this.db.transaction(['groups'], 'readwrite');
    const store = transaction.objectStore('groups');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Shifts operations
  async addShift(name) {
    const transaction = this.db.transaction(['shifts'], 'readwrite');
    const store = transaction.objectStore('shifts');
    
    const shift = {
      name: name.trim(),
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(shift);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllShifts() {
    const transaction = this.db.transaction(['shifts'], 'readonly');
    const store = transaction.objectStore('shifts');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteShift(id) {
    const transaction = this.db.transaction(['shifts'], 'readwrite');
    const store = transaction.objectStore('shifts');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Excel data operations
  async saveExcelData(data) {
    const transaction = this.db.transaction(['excelData'], 'readwrite');
    const store = transaction.objectStore('excelData');
    
    const excelRecord = {
      data: data,
      uploadDate: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(excelRecord);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getLatestExcelData() {
    const transaction = this.db.transaction(['excelData'], 'readonly');
    const store = transaction.objectStore('excelData');
    const index = store.index('uploadDate');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(cursor.value);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods
  async clearAllData() {
    const transaction = this.db.transaction(['people', 'groups', 'shifts', 'excelData'], 'readwrite');
    
    const peopleStore = transaction.objectStore('people');
    const groupsStore = transaction.objectStore('groups');
    const shiftsStore = transaction.objectStore('shifts');
    const excelStore = transaction.objectStore('excelData');
    
    return Promise.all([
      new Promise((resolve, reject) => {
        const request = peopleStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = groupsStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = shiftsStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = excelStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }

  async exportAllData() {
    const [people, groups, shifts, excelData] = await Promise.all([
      this.getAllPeople(),
      this.getAllGroups(),
      this.getAllShifts(),
      this.getLatestExcelData()
    ]);

    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        database: 'WeighbridgeDB'
      },
      people,
      groups,
      shifts,
      excelData
    };
  }

  async importData(data) {
    if (data.people && Array.isArray(data.people)) {
      for (const person of data.people) {
        await this.addPerson(person.name, person.group, person.shift);
      }
    }
    
    if (data.groups && Array.isArray(data.groups)) {
      for (const group of data.groups) {
        await this.addGroup(group.name);
      }
    }
    
    if (data.shifts && Array.isArray(data.shifts)) {
      for (const shift of data.shifts) {
        await this.addShift(shift.name);
      }
    }
  }
}

// Create and export a singleton instance
const db = new WeighbridgeDB();
export default db;
