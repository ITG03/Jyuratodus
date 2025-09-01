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
    <div className="upload-container">
      {/* Status Messages */}
      <div className="status-messages mb-4">
        {showSuccess && (
          <Alert variant="success" dismissible onClose={() => setShowSuccess(false)} className="status-alert success-alert">
            <div className="alert-content">
              <span className="alert-icon">✅</span>
              <div>
                <strong>Success!</strong> File uploaded successfully! 
                {dbInitialized ? ' Data saved to database.' : ' Data saved to session.'}
              </div>
            </div>
          </Alert>
        )}
        
        {showError && (
          <Alert variant="danger" dismissible onClose={() => setShowError(false)} className="status-alert error-alert">
            <div className="alert-content">
              <span className="alert-icon">❌</span>
              <div>
                <strong>Error:</strong> {errorMessage}
              </div>
            </div>
          </Alert>
        )}

        {!dbInitialized && (
          <Alert variant="info" className="status-alert info-alert">
            <div className="alert-content">
              <span className="alert-icon">⏳</span>
              <div>
                <strong>Initializing...</strong> Please wait while the database initializes.
              </div>
            </div>
          </Alert>
        )}
      </div>

      {/* File Upload Card */}
      <div className="upload-card modern-card mb-4">
        <div className="card-header-icon">
          <div className="icon-circle">
            <span className="upload-icon">📎</span>
          </div>
          <div className="header-content">
            <h3 className="card-title-upload">File Upload</h3>
            <p className="card-description">Choose an Excel file to upload and process</p>
          </div>
        </div>

        <div className="upload-form">
          <Form.Group className="file-input-group">
            <Form.Label className="file-label">
              <span className="label-icon">📁</span>
              Select Excel File
            </Form.Label>
            <div className="file-input-wrapper">
              <Form.Control
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileChange}
                disabled={uploading}
                className="file-input-modern"
              />
              <div className="file-input-help">
                <span className="help-icon">ℹ️</span>
                Supported formats: .xlsx, .xls
              </div>
            </div>
          </Form.Group>

          {uploading && (
            <div className="upload-progress-container">
              <div className="progress-header">
                <span className="progress-icon">⏳</span>
                <span className="progress-label">
                  {uploadProgress < 100 ? 'Processing file...' : 'Upload complete!'}
                </span>
                <span className="progress-percentage">{uploadProgress}%</span>
              </div>
              <ProgressBar 
                now={uploadProgress} 
                className="progress-bar-modern"
                variant="primary"
              />
            </div>
          )}

          <div className="upload-actions">
            <Button
              className="btn-upload-modern"
              onClick={handleUpload}
              disabled={!file || uploading || !dbInitialized}
              size="lg"
            >
              <span className="btn-icon">
                {uploading ? '⏳' : '🚀'}
              </span>
              {uploading ? 'Processing...' : 'Upload & Process'}
            </Button>
            
            {file && !uploading && (
              <div className="selected-file-info">
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Analysis Results */}
      {duplicateSummary && (
        <div className="analysis-card modern-card">
          <div className="card-header-analysis">
            <div className="analysis-icon-wrapper">
              <span className="analysis-icon">📊</span>
            </div>
            <div>
              <h4 className="analysis-title">Data Analysis Results</h4>
              <p className="analysis-description">Overview of your uploaded data</p>
            </div>
          </div>

          <div className="analysis-metrics">
            <div className="metrics-grid-modern">
              <div className="metric-card-modern">
                <div className="metric-icon">📝</div>
                <div className="metric-content">
                  <div className="metric-value">{duplicateSummary.totalNameOccurrences}</div>
                  <div className="metric-label">Total Rows</div>
                </div>
              </div>
              
              <div className="metric-card-modern">
                <div className="metric-icon">👤</div>
                <div className="metric-content">
                  <div className="metric-value">{duplicateSummary.totalUniqueNames}</div>
                  <div className="metric-label">Unique Names</div>
                </div>
              </div>
              
              <div className="metric-card-modern">
                <div className="metric-icon">⚠️</div>
                <div className="metric-content">
                  <div className="metric-value">{duplicateSummary.duplicateNames.length}</div>
                  <div className="metric-label">Duplicate Names</div>
                </div>
              </div>
              
              <div className="metric-card-modern">
                <div className="metric-icon">💾</div>
                <div className="metric-content">
                  <div className="metric-value">{duplicateSummary.totalUniqueNames}</div>
                  <div className="metric-label">Database Entries</div>
                </div>
              </div>
            </div>

            {duplicateSummary.hasDuplicates && (
              <div className="duplicates-section">
                <div className="duplicates-header">
                  <span className="duplicates-icon">🔄</span>
                  <strong>Names with Multiple Entries</strong>
                </div>
                <div className="duplicates-tags">
                  {duplicateSummary.duplicateNames.slice(0, 10).map((item, index) => (
                    <span key={index} className="duplicate-badge">
                      {item.name} <span className="count-badge">({item.count}x)</span>
                    </span>
                  ))}
                  {duplicateSummary.duplicateNames.length > 10 && (
                    <span className="more-badge">
                      +{duplicateSummary.duplicateNames.length - 10} more
                    </span>
                  )}
                </div>
                <div className="duplicates-note">
                  <span className="note-icon">💡</span>
                  <strong>Note:</strong> Duplicate names in Excel are automatically consolidated into single database entries.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


