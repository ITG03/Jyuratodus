import React, { useRef, useState } from 'react';
import { Button, Col, Row, Form, Alert } from 'react-bootstrap';
import { useApp } from '../context';

export default function DataImport() {
  const { setRows, setPeopleToGroup, setPeopleToShift } = useApp();
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileRef = useRef(null);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/json') {
      setErrorMessage('Please select a JSON file exported from this application.');
      setShowError(true);
      return;
    }
    
    setImportFile(file);
    setShowError(false);
  }

  async function importData() {
    if (!importFile) return;
    
    setImporting(true);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      
      // Validate the imported data structure
      if (!data.rawData || !Array.isArray(data.rawData)) {
        throw new Error('Invalid data format: missing raw data');
      }
      
      // Import the data
      setRows(data.rawData || []);
      setPeopleToGroup(data.groupAssignments || {});
      setPeopleToShift(data.shiftAssignments || {});
      
      setShowSuccess(true);
      setImportFile(null);
      if (fileRef.current) fileRef.current.value = '';
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Import failed:', error);
      setErrorMessage(`Import failed: ${error.message}`);
      setShowError(true);
    } finally {
      setImporting(false);
    }
  }

  function clearData() {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      setRows([]);
      setPeopleToGroup({});
      setPeopleToShift({});
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }

  return (
    <div className="section">
      <div className="section-title">Import/Backup Data</div>
      
      {showSuccess && (
        <Alert variant="success" dismissible onClose={() => setShowSuccess(false)}>
          Data imported successfully!
        </Alert>
      )}
      
      {showError && (
        <Alert variant="danger" dismissible onClose={() => setShowError(false)}>
          {errorMessage}
        </Alert>
      )}

      <Row className="g-3 align-items-end">
        <Col xs={12} md={8}>
          <Form.Label>Import JSON File</Form.Label>
          <Form.Control 
            type="file" 
            accept=".json"
            onChange={handleFileSelect}
            ref={fileRef}
            placeholder="Select a previously exported JSON file"
          />
          <div className="text-muted small mt-2">
            Select a JSON file that was exported from this application to restore your data
          </div>
        </Col>
        <Col xs={12} md="auto">
          <Button 
            className="btn-primary me-2" 
            onClick={importData}
            disabled={!importFile || importing}
          >
            {importing ? 'Importing...' : 'Import Data'}
          </Button>
          <Button 
            variant="outline-danger" 
            onClick={clearData}
            disabled={importing}
          >
            Clear All Data
          </Button>
        </Col>
      </Row>

      <div className="mt-4 p-3 bg-light rounded">
        <div className="fw-semibold mb-2">Backup & Restore Instructions:</div>
        <ol className="mb-0">
          <li><strong>Export your data</strong> using the Export section above</li>
          <li><strong>Save the exported file</strong> in a safe location</li>
          <li><strong>Import when needed</strong> by selecting the saved JSON file</li>
          <li><strong>Your groups and shifts</strong> will be automatically restored</li>
        </ol>
      </div>

      <div className="mt-3">
        <small className="text-muted">
          <strong>Note:</strong> Only JSON files exported from this application are supported. 
          The import will replace all current data, so make sure to export first if you want to keep your current work.
        </small>
      </div>
    </div>
  );
}
