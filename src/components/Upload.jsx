import React, { useState } from 'react';
import { Button, Form, Alert, ProgressBar } from 'react-bootstrap';
import { useApp } from '../context';
import { parseExcelFile } from '../excel';

export default function Upload() {
  const { setRows, db, dbInitialized } = useApp();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [duplicateSummary, setDuplicateSummary] = useState(null);

  async function onFileChange(e) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setErrorMessage('Please select an Excel file (.xlsx or .xls)');
      setShowError(true);
      return;
    }

    setFile(selectedFile);
    setShowError(false);
    setDuplicateSummary(null); // Clear previous analysis
  }

  async function handleUpload() {
    if (!file) return;
    if (!dbInitialized) {
      setErrorMessage('Database not initialized. Please wait a moment and try again.');
      setShowError(true);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 20, 90));
      }, 200);

      // Parse Excel file
      const rows = await parseExcelFile(file);
      setRows(rows);
      
      // Save to database
      await db.saveExcelData(rows);
      
      // Extract unique people names and add them to the database (no duplicates)
      const uniquePeople = [...new Set(rows.map(row => row.person).filter(Boolean))];
      
      for (const personName of uniquePeople) {
        try {
          await db.addPersonIfNotExists(personName, '', '');
          console.log(`Person ${personName} processed (added or updated if existing)`);
        } catch (error) {
          console.error(`Failed to process person ${personName}:`, error);
        }
      }

      // Get duplicate names summary for user information
      const duplicateSummaryData = await db.getDuplicateNamesSummary(rows);
      setDuplicateSummary(duplicateSummaryData);
      if (duplicateSummaryData.hasDuplicates) {
        console.log('Duplicate names found in Excel:', duplicateSummaryData.duplicateNames);
      }

      // Load existing assignments from database to sync with state
      try {
        const people = await db.getAllPeople();
        const groupAssignments = {};
        const shiftAssignments = {};
        
        people.forEach(person => {
          if (person.group) {
            groupAssignments[person.name] = person.group;
          }
          if (person.shift) {
            shiftAssignments[person.name] = person.shift;
          }
        });
        
        // Update context state with database assignments
        // Note: We need to call the context functions directly to avoid infinite loops
        // This will be handled by the context's useEffect that watches for dbInitialized
      } catch (error) {
        console.error('Failed to load existing assignments:', error);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setShowSuccess(true);
      setFile(null);
      if (document.querySelector('input[type="file"]')) {
        document.querySelector('input[type="file"]').value = '';
      }
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Upload failed:', error);
      setErrorMessage(`Upload failed: ${error.message}`);
      setShowError(true);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div>
      <div className="section-title">Upload Excel File</div>
      
      {showSuccess && (
        <Alert variant="success" dismissible onClose={() => setShowSuccess(false)}>
          File uploaded successfully! {dbInitialized ? 'Data saved to database.' : 'Data saved to session.'}
        </Alert>
      )}
      
      {showError && (
        <Alert variant="danger" dismissible onClose={() => setShowError(false)}>
          {errorMessage}
        </Alert>
      )}

      {duplicateSummary && (
        <Alert variant="info" className="mb-3">
          <div className="fw-semibold mb-2">Excel Data Analysis:</div>
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="text-muted small">Total Rows</div>
              <div className="fw-semibold">{duplicateSummary.totalNameOccurrences}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted small">Unique Names</div>
              <div className="fw-semibold">{duplicateSummary.totalUniqueNames}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted small">Duplicate Names</div>
              <div className="fw-semibold">{duplicateSummary.duplicateNames.length}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted small">Database Entries</div>
              <div className="fw-semibold">{duplicateSummary.totalUniqueNames}</div>
            </div>
          </div>
          {duplicateSummary.hasDuplicates && (
            <div className="mt-3">
              <div className="fw-semibold mb-2">Names with Multiple Entries:</div>
              <div className="d-flex flex-wrap gap-2">
                {duplicateSummary.duplicateNames.slice(0, 10).map((item, index) => (
                  <span key={index} className="badge bg-warning text-dark">
                    {item.name} ({item.count}x)
                  </span>
                ))}
                {duplicateSummary.duplicateNames.length > 10 && (
                  <span className="badge bg-secondary">
                    +{duplicateSummary.duplicateNames.length - 10} more
                  </span>
                )}
              </div>
              <div className="text-muted small mt-2">
                <strong>Note:</strong> Duplicate names in Excel are automatically consolidated into single database entries.
              </div>
            </div>
          )}
        </Alert>
      )}

      <Form.Group className="mb-3">
        <Form.Label>Select Excel File</Form.Label>
        <Form.Control
          type="file"
          accept=".xlsx,.xls"
          onChange={onFileChange}
          disabled={uploading}
        />
        <div className="text-muted small mt-2">
          Supported formats: .xlsx, .xls
        </div>
      </Form.Group>

      {uploading && (
        <div className="mb-3">
          <ProgressBar 
            now={uploadProgress} 
            label={`${uploadProgress}%`}
            className="mb-2"
          />
          <div className="text-muted small">
            {uploadProgress < 100 ? 'Processing file...' : 'Upload complete!'}
          </div>
        </div>
      )}

      <Button
        className="btn-primary"
        onClick={handleUpload}
        disabled={!file || uploading || !dbInitialized}
      >
        {uploading ? 'Uploading...' : 'Upload & Process'}
      </Button>

      {!dbInitialized && (
        <div className="mt-3">
          <Alert variant="info">
            <small>Initializing database... Please wait a moment before uploading.</small>
          </Alert>
        </div>
      )}
    </div>
  );
}


