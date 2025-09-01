import db from '../database';

// Mock IndexedDB for testing
const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

global.indexedDB = new FDBFactory();
global.IDBKeyRange = FDBKeyRange;

describe('Database Basic Functionality', () => {
  beforeAll(async () => {
    try {
      await db.init();
      console.log('Database initialized for testing');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  });

  test('should initialize database successfully', async () => {
    expect(db.db).toBeTruthy();
    expect(db.db.objectStoreNames.contains('people')).toBe(true);
    expect(db.db.objectStoreNames.contains('groups')).toBe(true);
    expect(db.db.objectStoreNames.contains('shifts')).toBe(true);
    expect(db.db.objectStoreNames.contains('excelData')).toBe(true);
  });

  test('should handle Excel data processing correctly', async () => {
    // Mock Excel data that would come from parsing
    const mockExcelRows = [
      { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-01', truckId: 'T001' },
      { person: 'Jane Smith', group: '', shift: '', impounded: true, date: '2024-01-02', truckId: 'T002' },
      { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-03', truckId: 'T003' },
    ];

    // Save Excel data to database (simulating upload process)
    try {
      await db.saveExcelData(mockExcelRows);
      console.log('Excel data saved successfully');
    } catch (error) {
      console.error('Failed to save Excel data:', error);
    }

    // Extract unique names (simulating Upload component logic)
    const uniquePeople = [...new Set(mockExcelRows.map(row => row.person).filter(Boolean))];
    expect(uniquePeople).toEqual(['John Doe', 'Jane Smith']);

    // Add people to database (simulating Upload component logic)
    for (const personName of uniquePeople) {
      try {
        await db.addPersonIfNotExists(personName, '', '');
        console.log(`Person ${personName} processed`);
      } catch (error) {
        console.error(`Failed to process person ${personName}:`, error);
      }
    }

    // Verify people were added correctly
    const people = await db.getAllPeople();
    expect(people).toHaveLength(2);
    
    const names = people.map(p => p.name).sort();
    expect(names).toEqual(['Jane Smith', 'John Doe']);

    // Verify Excel data was stored
    const excelData = await db.getLatestExcelData();
    expect(excelData).toBeTruthy();
    expect(excelData.data).toHaveLength(3);
  });

  test('should analyze duplicate names correctly', async () => {
    const mockExcelRows = [
      { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-01', truckId: 'T001' },
      { person: 'John Doe', group: '', shift: '', impounded: true, date: '2024-01-02', truckId: 'T002' },
      { person: 'Jane Smith', group: '', shift: '', impounded: false, date: '2024-01-03', truckId: 'T003' },
      { person: 'John Doe', group: '', shift: '', impounded: false, date: '2024-01-04', truckId: 'T004' }
    ];

    const summary = await db.getDuplicateNamesSummary(mockExcelRows);

    expect(summary.totalUniqueNames).toBe(2);
    expect(summary.totalNameOccurrences).toBe(4);
    expect(summary.hasDuplicates).toBe(true);
    expect(summary.duplicateNames).toHaveLength(1);
    expect(summary.duplicateNames[0].name).toBe('John Doe');
    expect(summary.duplicateNames[0].count).toBe(3);
  });

  test('should handle assignment updates correctly', async () => {
    // Clear any existing data
    try {
      await db.clearAllData();
    } catch (error) {
      // Ignore clear errors
    }

    // Add a person
    const personId = await db.addPersonIfNotExists('Test User', '', '');
    expect(personId).toBeTruthy();

    // Update their group and shift
    await db.updatePerson(personId, { group: 'Team A', shift: 'Morning' });

    // Verify the update
    const people = await db.getAllPeople();
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe('Test User');
    expect(people[0].group).toBe('Team A');
    expect(people[0].shift).toBe('Morning');
  });

  test('should handle empty or invalid data gracefully', async () => {
    const mockExcelRows = [
      { person: '', group: '', shift: '', impounded: false, date: '2024-01-01', truckId: 'T001' },
      { person: null, group: '', shift: '', impounded: true, date: '2024-01-02', truckId: 'T002' },
      { person: '   ', group: '', shift: '', impounded: false, date: '2024-01-03', truckId: 'T003' },
      { person: 'Valid User', group: '', shift: '', impounded: false, date: '2024-01-04', truckId: 'T004' }
    ];

    // Filter out invalid names (simulating Upload component logic)
    const validPeople = mockExcelRows
      .map(row => row.person)
      .filter(person => person && String(person).trim().length > 0)
      .map(person => String(person).trim());

    expect(validPeople).toEqual(['Valid User']);

    // Process valid people
    for (const personName of validPeople) {
      await db.addPersonIfNotExists(personName, '', '');
    }

    const people = await db.getAllPeople();
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe('Valid User');
  });
});