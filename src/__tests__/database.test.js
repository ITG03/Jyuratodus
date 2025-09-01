import db from '../database';
import { parseExcelFile } from '../excel';

// Mock IndexedDB for testing
const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

global.indexedDB = new FDBFactory();
global.IDBKeyRange = FDBKeyRange;

describe('WeighbridgeDB', () => {
  beforeEach(async () => {
    // Reset database instance
    if (db.db) {
      db.db.close();
      db.db = null;
    }
    
    // Initialize database before each test
    await db.init();
    
    // Wait a bit for database to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear all data to start fresh
    try {
      await db.clearAllData();
    } catch (error) {
      // Ignore clear errors on empty database
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (db.db) {
      db.db.close();
      db.db = null;
    }
  });

  describe('Database Initialization', () => {
    test('should initialize database successfully', async () => {
      expect(db.db).toBeTruthy();
      expect(db.db.objectStoreNames.contains('people')).toBe(true);
      expect(db.db.objectStoreNames.contains('groups')).toBe(true);
      expect(db.db.objectStoreNames.contains('shifts')).toBe(true);
      expect(db.db.objectStoreNames.contains('excelData')).toBe(true);
    });
  });

  describe('People Management', () => {
    test('should add a new person', async () => {
      const personId = await db.addPerson('John Doe', 'Team A', 'Morning');
      expect(personId).toBeTruthy();

      const people = await db.getAllPeople();
      expect(people).toHaveLength(1);
      expect(people[0].name).toBe('John Doe');
      expect(people[0].group).toBe('Team A');
      expect(people[0].shift).toBe('Morning');
    });

    test('should not add duplicate person but update existing', async () => {
      // Add first person
      await db.addPerson('John Doe', 'Team A', 'Morning');
      
      // Try to add same person with different group
      await db.addPerson('John Doe', 'Team B', 'Afternoon');
      
      const people = await db.getAllPeople();
      expect(people).toHaveLength(1);
      expect(people[0].name).toBe('John Doe');
      expect(people[0].group).toBe('Team B');
      expect(people[0].shift).toBe('Afternoon');
    });

    test('should find person by name case-insensitive', async () => {
      await db.addPerson('John Doe', 'Team A', 'Morning');
      
      const person1 = await db.findPersonByName('john doe');
      const person2 = await db.findPersonByName('JOHN DOE');
      const person3 = await db.findPersonByName('John Doe');
      
      expect(person1).toBeTruthy();
      expect(person2).toBeTruthy();
      expect(person3).toBeTruthy();
      expect(person1.name).toBe('John Doe');
      expect(person2.name).toBe('John Doe');
      expect(person3.name).toBe('John Doe');
    });

    test('should add person if not exists', async () => {
      // Add first person
      const id1 = await db.addPersonIfNotExists('John Doe', 'Team A', 'Morning');
      
      // Try to add same person - should return existing ID
      const id2 = await db.addPersonIfNotExists('John Doe', 'Team A', 'Morning');
      
      expect(id1).toBe(id2);
      
      const people = await db.getAllPeople();
      expect(people).toHaveLength(1);
    });

    test('should update person successfully', async () => {
      const personId = await db.addPerson('John Doe', 'Team A', 'Morning');
      
      await db.updatePerson(personId, { group: 'Team B', shift: 'Afternoon' });
      
      const people = await db.getAllPeople();
      expect(people[0].group).toBe('Team B');
      expect(people[0].shift).toBe('Afternoon');
    });

    test('should delete person successfully', async () => {
      const personId = await db.addPerson('John Doe', 'Team A', 'Morning');
      
      await db.deletePerson(personId);
      
      const people = await db.getAllPeople();
      expect(people).toHaveLength(0);
    });

    test('should get people by group', async () => {
      await db.addPerson('John Doe', 'Team A', 'Morning');
      await db.addPerson('Jane Smith', 'Team A', 'Afternoon');
      await db.addPerson('Bob Wilson', 'Team B', 'Night');
      
      const teamA = await db.getPeopleByGroup('Team A');
      expect(teamA).toHaveLength(2);
      expect(teamA.map(p => p.name)).toContain('John Doe');
      expect(teamA.map(p => p.name)).toContain('Jane Smith');
    });

    test('should get people by shift', async () => {
      await db.addPerson('John Doe', 'Team A', 'Morning');
      await db.addPerson('Jane Smith', 'Team B', 'Morning');
      await db.addPerson('Bob Wilson', 'Team A', 'Night');
      
      const morningShift = await db.getPeopleByShift('Morning');
      expect(morningShift).toHaveLength(2);
      expect(morningShift.map(p => p.name)).toContain('John Doe');
      expect(morningShift.map(p => p.name)).toContain('Jane Smith');
    });
  });

  describe('Groups Management', () => {
    test('should add and retrieve groups', async () => {
      await db.addGroup('Team A');
      await db.addGroup('Team B');
      
      const groups = await db.getAllGroups();
      expect(groups).toHaveLength(2);
      expect(groups.map(g => g.name)).toContain('Team A');
      expect(groups.map(g => g.name)).toContain('Team B');
    });

    test('should delete group', async () => {
      const groupId = await db.addGroup('Team A');
      await db.deleteGroup(groupId);
      
      const groups = await db.getAllGroups();
      expect(groups).toHaveLength(0);
    });
  });

  describe('Shifts Management', () => {
    test('should add and retrieve shifts', async () => {
      await db.addShift('Morning');
      await db.addShift('Afternoon');
      
      const shifts = await db.getAllShifts();
      expect(shifts).toHaveLength(2);
      expect(shifts.map(s => s.name)).toContain('Morning');
      expect(shifts.map(s => s.name)).toContain('Afternoon');
    });

    test('should delete shift', async () => {
      const shiftId = await db.addShift('Morning');
      await db.deleteShift(shiftId);
      
      const shifts = await db.getAllShifts();
      expect(shifts).toHaveLength(0);
    });
  });

  describe('Excel Data Management', () => {
    test('should save and retrieve Excel data', async () => {
      const testData = [
        { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-01', truckId: 'T001' },
        { person: 'Jane Smith', group: '', shift: '', impounded: true, date: '2024-01-02', truckId: 'T002' }
      ];
      
      const dataId = await db.saveExcelData(testData);
      expect(dataId).toBeTruthy();
      
      const retrievedData = await db.getLatestExcelData();
      expect(retrievedData).toBeTruthy();
      expect(retrievedData.data).toEqual(testData);
    });

    test('should analyze duplicate names in Excel data', async () => {
      const testData = [
        { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-01', truckId: 'T001' },
        { person: 'John Doe', group: '', shift: '', impounded: true, date: '2024-01-02', truckId: 'T002' },
        { person: 'Jane Smith', group: '', shift: '', impounded: false, date: '2024-01-03', truckId: 'T003' },
        { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-04', truckId: 'T004' }
      ];
      
      const summary = await db.getDuplicateNamesSummary(testData);
      
      expect(summary.totalUniqueNames).toBe(2);
      expect(summary.totalNameOccurrences).toBe(4);
      expect(summary.hasDuplicates).toBe(true);
      expect(summary.duplicateNames).toHaveLength(1);
      expect(summary.duplicateNames[0].name).toBe('John Doe');
      expect(summary.duplicateNames[0].count).toBe(3);
    });
  });

  describe('Data Import/Export', () => {
    test('should export all data', async () => {
      // Add test data
      await db.addPerson('John Doe', 'Team A', 'Morning');
      await db.addGroup('Team A');
      await db.addShift('Morning');
      await db.saveExcelData([{ person: 'John Doe', date: '2024-01-01' }]);
      
      const exportedData = await db.exportAllData();
      
      expect(exportedData.metadata).toBeTruthy();
      expect(exportedData.people).toHaveLength(1);
      expect(exportedData.groups).toHaveLength(1);
      expect(exportedData.shifts).toHaveLength(1);
      expect(exportedData.excelData).toBeTruthy();
    });

    test('should import data', async () => {
      const importData = {
        people: [
          { name: 'John Doe', group: 'Team A', shift: 'Morning' },
          { name: 'Jane Smith', group: 'Team B', shift: 'Afternoon' }
        ],
        groups: [
          { name: 'Team A' },
          { name: 'Team B' }
        ],
        shifts: [
          { name: 'Morning' },
          { name: 'Afternoon' }
        ]
      };
      
      await db.importData(importData);
      
      const people = await db.getAllPeople();
      const groups = await db.getAllGroups();
      const shifts = await db.getAllShifts();
      
      expect(people).toHaveLength(2);
      expect(groups).toHaveLength(2);
      expect(shifts).toHaveLength(2);
    });
  });

  describe('Database Integration with Excel Processing', () => {
    test('should process Excel data and store people in database', async () => {
      // Create mock Excel data
      const mockExcelRows = [
        { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-01', truckId: 'T001' },
        { person: 'Jane Smith', group: '', shift: '', impounded: true, date: '2024-01-02', truckId: 'T002' },
        { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-03', truckId: 'T003' },
        { person: 'Bob Wilson', group: '', shift: '', impounded: false, date: '2024-01-04', truckId: 'T004' }
      ];
      
      // Save Excel data
      await db.saveExcelData(mockExcelRows);
      
      // Extract unique people names (simulating Upload component logic)
      const uniquePeople = [...new Set(mockExcelRows.map(row => row.person).filter(Boolean))];
      
      // Add people to database
      for (const personName of uniquePeople) {
        await db.addPersonIfNotExists(personName, '', '');
      }
      
      // Verify database state
      const people = await db.getAllPeople();
      expect(people).toHaveLength(3); // John Doe, Jane Smith, Bob Wilson
      expect(people.map(p => p.name)).toContain('John Doe');
      expect(people.map(p => p.name)).toContain('Jane Smith');
      expect(people.map(p => p.name)).toContain('Bob Wilson');
      
      // Verify Excel data was saved
      const excelData = await db.getLatestExcelData();
      expect(excelData.data).toHaveLength(4);
    });

    test('should handle empty or invalid person names from Excel', async () => {
      const mockExcelRows = [
        { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-01', truckId: 'T001' },
        { person: '', group: '', shift: '', impounded: true, date: '2024-01-02', truckId: 'T002' },
        { person: null, group: '', shift: '', impounded: false, date: '2024-01-03', truckId: 'T003' },
        { person: '   ', group: '', shift: '', impounded: false, date: '2024-01-04', truckId: 'T004' }
      ];
      
      // Save Excel data
      await db.saveExcelData(mockExcelRows);
      
      // Extract unique people names, filtering out invalid ones
      const uniquePeople = [...new Set(mockExcelRows.map(row => row.person).filter(Boolean))];
      const validPeople = uniquePeople.filter(name => name && String(name).trim().length > 0);
      
      // Add people to database
      for (const personName of validPeople) {
        await db.addPersonIfNotExists(personName, '', '');
      }
      
      // Verify only valid people were added
      const people = await db.getAllPeople();
      expect(people).toHaveLength(1);
      expect(people[0].name).toBe('John Doe');
    });

    test('should maintain data consistency when updating assignments', async () => {
      // Add initial person
      await db.addPerson('John Doe', '', '');
      
      // Add groups and shifts
      await db.addGroup('Team A');
      await db.addShift('Morning');
      
      // Update person's group and shift
      const people = await db.getAllPeople();
      const johnDoe = people.find(p => p.name === 'John Doe');
      
      await db.updatePerson(johnDoe.id, { group: 'Team A', shift: 'Morning' });
      
      // Verify update
      const updatedPeople = await db.getAllPeople();
      const updatedJohn = updatedPeople.find(p => p.name === 'John Doe');
      
      expect(updatedJohn.group).toBe('Team A');
      expect(updatedJohn.shift).toBe('Morning');
      expect(new Date(updatedJohn.updatedAt)).toBeInstanceOf(Date);
    });
  });
});