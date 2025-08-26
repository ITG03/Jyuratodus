import React, { useState } from 'react';
import { Button, Col, Row, Form, Alert } from 'react-bootstrap';
import { useApp } from '../context';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function DataExport() {
  const { rows, peopleToGroup, peopleToShift, db, dbInitialized } = useApp();
  const [exportFormat, setExportFormat] = useState('json');
  const [exportName, setExportName] = useState('weighbridge-data');
  const [showSuccess, setShowSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    if (!dbInitialized) {
      alert('Database not initialized. Please wait a moment and try again.');
      return;
    }

    setExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${exportName}-${timestamp}`;

      switch (exportFormat) {
        case 'json':
          await exportJSON(filename);
          break;
        case 'csv':
          await exportCSV(filename);
          break;
        case 'excel':
          await exportExcel(filename);
          break;
        case 'database':
          await exportDatabase(filename);
          break;
        default:
          await exportJSON(filename);
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function exportJSON(filename) {
    const data = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalRows: rows.length,
        totalPeople: Object.keys(peopleToGroup).length,
        version: '1.0'
      },
      rawData: rows,
      groupAssignments: peopleToGroup,
      shiftAssignments: peopleToShift,
      summary: generateSummary()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `${filename}.json`);
  }

  async function exportCSV(filename) {
    // Create enhanced CSV with group and shift data
    const enhancedRows = rows.map(row => ({
      ...row,
      assignedGroup: peopleToGroup[row.person] || 'Unassigned',
      assignedShift: peopleToShift[row.person] || 'Unassigned'
    }));

    const csvContent = convertToCSV(enhancedRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${filename}.csv`);
  }

  async function exportExcel(filename) {
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book();
    
    // Raw data sheet
    const enhancedRows = rows.map(row => ({
      ...row,
      assignedGroup: peopleToGroup[row.person] || 'Unassigned',
      assignedShift: peopleToShift[row.person] || 'Unassigned'
    }));
    const ws1 = XLSX.utils.json_to_sheet(enhancedRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Raw Data');

    // Summary sheet
    const summary = generateSummary();
    const summaryRows = [
      { metric: 'Total Trucks', value: summary.totalTrucks },
      { metric: 'Total Impounded', value: summary.totalImpounded },
      { metric: 'Total People', value: summary.totalPeople },
      { metric: 'Groups Created', value: summary.totalGroups },
      { metric: 'Shifts Assigned', value: summary.shiftsAssigned }
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

    // Group assignments sheet
    const groupRows = Object.entries(peopleToGroup).map(([person, group]) => ({
      person,
      group: group || 'Unassigned'
    }));
    const ws3 = XLSX.utils.json_to_sheet(groupRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Group Assignments');

    // Shift assignments sheet
    const shiftRows = Object.entries(peopleToShift).map(([person, shift]) => ({
      person,
      shift: shift || 'Unassigned'
    }));
    const ws4 = XLSX.utils.json_to_sheet(shiftRows);
    XLSX.utils.book_append_sheet(wb, ws4, 'Shift Assignments');

    // Save the workbook
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  async function exportDatabase(filename) {
    try {
      const dbData = await db.exportAllData();
      const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
      saveAs(blob, `${filename}-database.json`);
    } catch (error) {
      throw new Error(`Database export failed: ${error.message}`);
    }
  }

  function generateSummary() {
    const totalTrucks = rows.length;
    const totalImpounded = rows.filter(r => r.impounded).length;
    const totalPeople = Object.keys(peopleToGroup).length;
    const totalGroups = new Set(Object.values(peopleToGroup).filter(Boolean)).size;
    const shiftsAssigned = Object.values(peopleToShift).filter(Boolean).length;

    return {
      totalTrucks,
      totalImpounded,
      totalPeople,
      totalGroups,
      shiftsAssigned
    };
  }

  function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }

  return (
    <div className="section">
      <div className="section-title">Export Data</div>
      
      {showSuccess && (
        <Alert variant="success" dismissible onClose={() => setShowSuccess(false)}>
          Data exported successfully!
        </Alert>
      )}

      <Row className="g-3 align-items-end">
        <Col xs={12} md={4}>
          <Form.Label>Export Format</Form.Label>
          <Form.Select value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
            <option value="json">JSON (Complete Data)</option>
            <option value="csv">CSV (Enhanced Data)</option>
            <option value="excel">Excel (Multiple Sheets)</option>
            <option value="database">Database (All Records)</option>
          </Form.Select>
        </Col>
        <Col xs={12} md={4}>
          <Form.Label>Filename</Form.Label>
          <Form.Control 
            value={exportName} 
            onChange={e => setExportName(e.target.value)}
            placeholder="Enter filename"
          />
        </Col>
        <Col xs={12} md="auto">
          <Button 
            className="btn-primary" 
            onClick={exportData}
            disabled={!dbInitialized || exporting}
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </Col>
      </Row>

      <div className="mt-3">
        <small className="text-muted">
          <strong>JSON:</strong> Complete data including metadata, raw data, and assignments<br/>
          <strong>CSV:</strong> Enhanced data with group and shift assignments<br/>
          <strong>Excel:</strong> Multiple sheets with raw data, summary, and assignments<br/>
          <strong>Database:</strong> All database records including people, groups, and shifts
        </small>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 p-3 bg-light rounded">
          <div className="fw-semibold mb-2">Export Summary:</div>
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="text-muted small">Total Rows</div>
              <div className="fw-semibold">{rows.length}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted small">People</div>
              <div className="fw-semibold">{Object.keys(peopleToGroup).length}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted small">Groups</div>
              <div className="fw-semibold">{new Set(Object.values(peopleToGroup).filter(Boolean)).size}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted small">Shifts</div>
              <div className="fw-semibold">{Object.values(peopleToShift).filter(Boolean).length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
