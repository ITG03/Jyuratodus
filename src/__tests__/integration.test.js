import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context';
import Upload from '../components/Upload';
import PeopleManagement from '../components/PeopleManagement';
import db from '../database';

// Mock IndexedDB for testing
const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

global.indexedDB = new FDBFactory();
global.IDBKeyRange = FDBKeyRange;

// Mock file reading
global.FileReader = class MockFileReader {
  constructor() {
    this.result = null;
    this.error = null;
    this.readyState = 0;
    this.onload = null;
    this.onerror = null;
  }

  readAsArrayBuffer() {
    setTimeout(() => {
      this.readyState = 2;
      this.result = new ArrayBuffer(8);
      if (this.onload) this.onload();
    }, 10);
  }
};

// Mock XLSX
jest.mock('xlsx', () => ({
  read: jest.fn(() => ({
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {}
    }
  })),
  utils: {
    sheet_to_json: jest.fn(() => [
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
    ])
  }
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <AppProvider>
    {children}
  </AppProvider>
);

describe('Database Integration Tests', () => {
  beforeEach(async () => {
    await db.init();
    await db.clearAllData();
  });

  afterEach(async () => {
    if (db.db) {
      db.db.close();
    }
  });

  describe('Excel Upload and Database Storage', () => {
    test('should upload Excel file and store data in database', async () => {
      render(
        <TestWrapper>
          <Upload />
        </TestWrapper>
      );

      // Wait for database initialization
      await waitFor(() => {
        expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
      });

      // Create a mock file
      const mockFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Find file input and upload
      const fileInput = screen.getByRole('textbox', { hidden: true });
      await userEvent.upload(fileInput, mockFile);

      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload & process/i });
      await userEvent.click(uploadButton);

      // Wait for upload to complete
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify data was stored in database
      const people = await db.getAllPeople();
      expect(people.length).toBeGreaterThan(0);
      
      const excelData = await db.getLatestExcelData();
      expect(excelData).toBeTruthy();
      expect(excelData.data).toBeDefined();
    });

    test('should handle duplicate names correctly during upload', async () => {
      // Mock XLSX to return data with duplicates
      const mockExcelData = [
        { 'User Full Name': 'John Doe', 'In Detention': 'No', 'Date': '2024-01-01', 'Truck': 'T001' },
        { 'User Full Name': 'John Doe', 'In Detention': 'Yes', 'Date': '2024-01-02', 'Truck': 'T002' },
        { 'User Full Name': 'Jane Smith', 'In Detention': 'No', 'Date': '2024-01-03', 'Truck': 'T003' }
      ];

      require('xlsx').utils.sheet_to_json.mockReturnValue(mockExcelData);

      render(
        <TestWrapper>
          <Upload />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
      });

      const mockFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileInput = screen.getByRole('textbox', { hidden: true });
      await userEvent.upload(fileInput, mockFile);

      const uploadButton = screen.getByRole('button', { name: /upload & process/i });
      await userEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show duplicate analysis
      await waitFor(() => {
        expect(screen.getByText(/data analysis results/i)).toBeInTheDocument();
      });

      // Verify only unique people were added to database
      const people = await db.getAllPeople();
      expect(people).toHaveLength(2); // Only John Doe and Jane Smith
      expect(people.map(p => p.name)).toContain('John Doe');
      expect(people.map(p => p.name)).toContain('Jane Smith');
    });
  });

  describe('People Management Integration', () => {
    test('should load people from database and display in management interface', async () => {
      // Pre-populate database
      await db.addPerson('John Doe', 'Team A', 'Morning');
      await db.addPerson('Jane Smith', 'Team B', 'Afternoon');

      render(
        <TestWrapper>
          <PeopleManagement />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Verify groups and shifts are displayed
      expect(screen.getByText('Team A')).toBeInTheDocument();
      expect(screen.getByText('Team B')).toBeInTheDocument();
      expect(screen.getByText('Morning')).toBeInTheDocument();
      expect(screen.getByText('Afternoon')).toBeInTheDocument();
    });

    test('should add new person through interface and save to database', async () => {
      render(
        <TestWrapper>
          <PeopleManagement />
        </TestWrapper>
      );

      // Click add person button
      const addButton = screen.getByRole('button', { name: /add new person/i });
      await userEvent.click(addButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText(/add new person/i)).toBeInTheDocument();
      });

      // Fill in the form
      const nameInput = screen.getByPlaceholderText(/enter full name/i);
      await userEvent.type(nameInput, 'Bob Wilson');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /add person/i });
      await userEvent.click(submitButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/operation completed successfully/i)).toBeInTheDocument();
      });

      // Verify person was added to database
      const people = await db.getAllPeople();
      expect(people).toHaveLength(1);
      expect(people[0].name).toBe('Bob Wilson');
    });

    test('should edit existing person and update database', async () => {
      // Pre-populate database
      await db.addPerson('John Doe', 'Team A', 'Morning');

      render(
        <TestWrapper>
          <PeopleManagement />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText(/edit person/i)).toBeInTheDocument();
      });

      // Update the name
      const nameInput = screen.getByDisplayValue('John Doe');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'John Smith');

      // Submit
      const updateButton = screen.getByRole('button', { name: /update person/i });
      await userEvent.click(updateButton);

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText(/operation completed successfully/i)).toBeInTheDocument();
      });

      // Verify database was updated
      const people = await db.getAllPeople();
      expect(people).toHaveLength(1);
      expect(people[0].name).toBe('John Smith');
    });

    test('should delete person and remove from database', async () => {
      // Pre-populate database
      await db.addPerson('John Doe', 'Team A', 'Morning');

      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      render(
        <TestWrapper>
          <PeopleManagement />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/operation completed successfully/i)).toBeInTheDocument();
      });

      // Verify person was removed from database
      const people = await db.getAllPeople();
      expect(people).toHaveLength(0);
    });

    test('should collapse table when more than 3 people exist', async () => {
      // Pre-populate with 5 people
      for (let i = 1; i <= 5; i++) {
        await db.addPerson(`Person ${i}`, 'Team A', 'Morning');
      }

      render(
        <TestWrapper>
          <PeopleManagement />
        </TestWrapper>
      );

      // Wait for data to load - should auto-collapse
      await waitFor(() => {
        expect(screen.getByText('Person 1')).toBeInTheDocument();
        expect(screen.getByText('Person 2')).toBeInTheDocument();
        expect(screen.getByText('Person 3')).toBeInTheDocument();
      });

      // Should not show Person 4 and 5 initially
      expect(screen.queryByText('Person 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Person 5')).not.toBeInTheDocument();

      // Should show "Show All" button
      const showAllButton = screen.getByRole('button', { name: /show all \(5\)/i });
      expect(showAllButton).toBeInTheDocument();

      // Click to expand
      await userEvent.click(showAllButton);

      // Now should show all people
      await waitFor(() => {
        expect(screen.getByText('Person 4')).toBeInTheDocument();
        expect(screen.getByText('Person 5')).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    test('should maintain data consistency across component remounts', async () => {
      // Add data through one component
      await db.addPerson('John Doe', 'Team A', 'Morning');
      await db.addGroup('Team A');
      await db.addShift('Morning');

      const { unmount, rerender } = render(
        <TestWrapper>
          <PeopleManagement />
        </TestWrapper>
      );

      // Verify data is displayed
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Unmount and remount
      unmount();
      
      rerender(
        <TestWrapper>
          <PeopleManagement />
        </TestWrapper>
      );

      // Data should still be there
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Verify database still has the data
      const people = await db.getAllPeople();
      expect(people).toHaveLength(1);
      expect(people[0].name).toBe('John Doe');
    });
  });
});