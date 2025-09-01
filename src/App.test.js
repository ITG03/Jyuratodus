import { render, screen } from '@testing-library/react';
import App from './App';
import { AppProvider } from './context';

// Mock IndexedDB for testing
const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

global.indexedDB = new FDBFactory();
global.IDBKeyRange = FDBKeyRange;

test('renders Mwila ShiftBoss application', () => {
  render(
    <AppProvider>
      <App />
    </AppProvider>
  );
  
  // Check for app branding
  const brandElement = screen.getByText(/Mwila ShiftBoss/i);
  expect(brandElement).toBeInTheDocument();
  
  // Check for navigation elements
  const uploadLink = screen.getByText(/Upload/i);
  const analyticsLink = screen.getByText(/Analytics/i);
  const managementLink = screen.getByText(/Management/i);
  
  expect(uploadLink).toBeInTheDocument();
  expect(analyticsLink).toBeInTheDocument();
  expect(managementLink).toBeInTheDocument();
});

test('should have proper navigation structure', () => {
  render(
    <AppProvider>
      <App />
    </AppProvider>
  );
  
  // Check for key navigation items
  expect(screen.getByText('Upload')).toBeInTheDocument();
  expect(screen.getByText('Analytics')).toBeInTheDocument();
  expect(screen.getByText('Management')).toBeInTheDocument();
  expect(screen.getByText('Import')).toBeInTheDocument();
  expect(screen.getByText('Export')).toBeInTheDocument();
});
