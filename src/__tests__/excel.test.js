import { parseExcelFile } from '../excel';

// Mock XLSX module
jest.mock('xlsx', () => {
  let mockData = [];
  
  return {
    read: jest.fn(() => ({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    })),
    utils: {
      sheet_to_json: jest.fn(() => mockData),
      book_new: jest.fn(),
      json_to_sheet: jest.fn(),
      book_append_sheet: jest.fn(),
      write: jest.fn()
    },
    // Helper to set mock data
    __setMockData: (data) => {
      mockData = data;
    }
  };
});

// Mock file for testing
class MockFile {
  constructor(data, name) {
    this.data = data;
    this.name = name;
    // Set the mock data for XLSX
    const XLSX = require('xlsx');
    XLSX.__setMockData(data);
  }

  async arrayBuffer() {
    return new ArrayBuffer(8);
  }
}

describe('Excel Parser', () => {
  describe('parseExcelFile', () => {
    test('should parse basic Excel data with standard headers', async () => {
      const mockData = [
        {
          'User Full Name': 'John Doe',
          'In Detention': 'No',
          'Date': '2024-01-01',
          'Truck': 'T001'
        },
        {
          'User Full Name': 'Jane Smith',
          'In Detention': 'Yes',
          'Date': '2024-01-02',
          'Truck': 'T002'
        }
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result).toHaveLength(2);
      expect(result[0].person).toBe('John Doe');
      expect(result[0].impounded).toBe(false);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].truckId).toBe('T001');
      
      expect(result[1].person).toBe('Jane Smith');
      expect(result[1].impounded).toBe(true);
      expect(result[1].date).toBe('2024-01-02');
      expect(result[1].truckId).toBe('T002');
    });

    test('should handle alternative header names', async () => {
      const mockData = [
        {
          'Operator': 'John Doe',
          'Detention': 'false',
          'Datetime': '2024-01-01T10:00:00',
          'Truck No': 'T001'
        },
        {
          'Person': 'Jane Smith',
          'Impounded': 'true',
          'Date': '2024-01-02',
          'Vehicle': 'T002'
        }
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result).toHaveLength(2);
      expect(result[0].person).toBe('John Doe');
      expect(result[0].impounded).toBe(false);
      expect(result[1].person).toBe('Jane Smith');
      expect(result[1].impounded).toBe(true);
    });

    test('should handle missing or empty values gracefully', async () => {
      const mockData = [
        {
          'User Full Name': '',
          'In Detention': '',
          'Date': '',
          'Truck': ''
        },
        {
          'User Full Name': 'Jane Smith',
          // Missing other fields
        }
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result).toHaveLength(2);
      expect(result[0].person).toBe('');
      expect(result[0].impounded).toBe(false);
      expect(result[0].date).toBe('');
      expect(result[0].truckId).toBe('');
      
      expect(result[1].person).toBe('Jane Smith');
      expect(result[1].impounded).toBe(false);
    });

    test('should normalize boolean values correctly', async () => {
      const mockData = [
        { 'User Full Name': 'Person1', 'In Detention': 'Yes' },
        { 'User Full Name': 'Person2', 'In Detention': 'yes' },
        { 'User Full Name': 'Person3', 'In Detention': 'TRUE' },
        { 'User Full Name': 'Person4', 'In Detention': 'true' },
        { 'User Full Name': 'Person5', 'In Detention': '1' },
        { 'User Full Name': 'Person6', 'In Detention': 'Y' },
        { 'User Full Name': 'Person7', 'In Detention': 'No' },
        { 'User Full Name': 'Person8', 'In Detention': 'false' },
        { 'User Full Name': 'Person9', 'In Detention': '0' },
        { 'User Full Name': 'Person10', 'In Detention': '' },
        { 'User Full Name': 'Person11', 'In Detention': 1 }, // number
        { 'User Full Name': 'Person12', 'In Detention': 0 }, // number
        { 'User Full Name': 'Person13', 'In Detention': true }, // boolean
        { 'User Full Name': 'Person14', 'In Detention': false } // boolean
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result[0].impounded).toBe(true);  // Yes
      expect(result[1].impounded).toBe(true);  // yes
      expect(result[2].impounded).toBe(true);  // TRUE
      expect(result[3].impounded).toBe(true);  // true
      expect(result[4].impounded).toBe(true);  // '1'
      expect(result[5].impounded).toBe(true);  // Y
      expect(result[6].impounded).toBe(false); // No
      expect(result[7].impounded).toBe(false); // false
      expect(result[8].impounded).toBe(false); // '0'
      expect(result[9].impounded).toBe(false); // ''
      expect(result[10].impounded).toBe(true); // 1
      expect(result[11].impounded).toBe(false); // 0
      expect(result[12].impounded).toBe(true); // true
      expect(result[13].impounded).toBe(false); // false
    });

    test('should preserve raw data', async () => {
      const mockData = [
        {
          'User Full Name': 'John Doe',
          'In Detention': 'No',
          'Date': '2024-01-01',
          'Truck': 'T001',
          'Extra Field': 'Extra Value',
          'Custom Data': 123
        }
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result).toHaveLength(1);
      expect(result[0]._raw).toEqual(mockData[0]);
      expect(result[0]._raw['Extra Field']).toBe('Extra Value');
      expect(result[0]._raw['Custom Data']).toBe(123);
    });

    test('should handle fuzzy header matching', async () => {
      const mockData = [
        {
          'full name': 'John Doe',
          'is in detention': 'No',
          'date time': '2024-01-01',
          'truck plate': 'T001'
        },
        {
          'weighed by': 'Jane Smith',
          'held': 'Yes',
          'time': '2024-01-02',
          'vehicle number': 'T002'
        }
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result).toHaveLength(2);
      expect(result[0].person).toBe('John Doe');
      expect(result[0].impounded).toBe(false);
      expect(result[1].person).toBe('Jane Smith');
      expect(result[1].impounded).toBe(true);
    });

    test('should initialize empty group and shift fields', async () => {
      const mockData = [
        {
          'User Full Name': 'John Doe',
          'In Detention': 'No',
          'Date': '2024-01-01',
          'Truck': 'T001'
        }
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result).toHaveLength(1);
      expect(result[0].group).toBe('');
      expect(result[0].shift).toBe('');
    });

    test('should handle multiple person name fields and pick first non-empty', async () => {
      const mockData = [
        {
          'User Full Name': '',
          'Operator': 'John Doe',
          'Person': 'Ignored Person',
          'Name': 'Also Ignored'
        },
        {
          'User Full Name': 'Jane Smith',
          'Operator': 'Ignored Operator',
          'Person': 'Ignored Person'
        }
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result).toHaveLength(2);
      expect(result[0].person).toBe('John Doe'); // Should pick first non-empty
      expect(result[1].person).toBe('Jane Smith'); // Should pick first field
    });

    test('should handle empty Excel file', async () => {
      const mockData = [];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result).toHaveLength(0);
    });

    test('should handle Excel file with only headers', async () => {
      const mockData = [
        {
          'User Full Name': undefined,
          'In Detention': undefined,
          'Date': undefined,
          'Truck': undefined
        }
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      expect(result).toHaveLength(1);
      expect(result[0].person).toBe('');
      expect(result[0].impounded).toBe(false);
      expect(result[0].date).toBe('');
      expect(result[0].truckId).toBe('');
    });
  });

  describe('Header mapping function', () => {
    test('should build correct header map with various header formats', async () => {
      const mockData = [
        {
          'User Full Name': 'John',
          'In Detention': 'No',
          'Date Time': '2024-01-01',
          'Truck Number': 'T001'
        }
      ];

      const mockFile = new MockFile(mockData, 'test.xlsx');
      const result = await parseExcelFile(mockFile);

      // Should successfully parse with fuzzy matching
      expect(result[0].person).toBe('John');
      expect(result[0].impounded).toBe(false);
    });
  });
});