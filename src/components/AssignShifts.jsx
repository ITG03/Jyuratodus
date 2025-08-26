import React, { useState, useEffect } from 'react';
import { Button, Col, Row, Form, Alert, Table, Modal } from 'react-bootstrap';
import { useApp } from '../context';
import db from '../database';

export default function AssignShifts() {
  const { rows, peopleToShift, setPeopleToShift, distinctPeople } = useApp();
  const [shifts, setShifts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadShifts();
  }, []);

  // Auto-collapse when more than 3 shifts or people
  useEffect(() => {
    if (shifts.length > 3 || distinctPeople.length > 3) {
      setIsCollapsed(true);
    }
  }, [shifts.length, distinctPeople.length]);

  async function loadShifts() {
    try {
      const shiftsData = await db.getAllShifts();
      setShifts(shiftsData);
    } catch (error) {
      console.error('Failed to load shifts:', error);
    }
  }

  async function handleCreateShift(e) {
    e.preventDefault();
    
    if (!newShiftName.trim()) {
      setErrorMessage('Shift name is required');
      setShowError(true);
      return;
    }

    try {
      await db.addShift(newShiftName.trim());
      await loadShifts();
      setNewShiftName('');
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to create shift:', error);
      setErrorMessage(`Failed to create shift: ${error.message}`);
      setShowError(true);
    }
  }

  async function handleDeleteShift(shiftId, shiftName) {
    if (window.confirm(`Are you sure you want to delete the shift "${shiftName}"? This will unassign all people from this shift.`)) {
      try {
        // Remove shift assignments for this shift
        const updatedAssignments = { ...peopleToShift };
        Object.keys(updatedAssignments).forEach(person => {
          if (updatedAssignments[person] === shiftName) {
            updatedAssignments[person] = '';
          }
        });
        await setPeopleToShift(updatedAssignments);

        // Delete the shift from database
        await db.deleteShift(shiftId);
        await loadShifts();
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (error) {
        console.error('Failed to delete shift:', error);
        setErrorMessage('Failed to delete shift');
        setShowError(true);
      }
    }
  }

  async function handleShiftAssignment(person, shiftName) {
    const updated = { ...peopleToShift };
    updated[person] = shiftName;
    await setPeopleToShift(updated);
  }

  // Get people grouped by their assigned shift
  const peopleByShift = {};
  distinctPeople.forEach(person => {
    const shift = peopleToShift[person] || 'Unassigned';
    if (!peopleByShift[shift]) {
      peopleByShift[shift] = [];
    }
    peopleByShift[shift].push(person);
  });

  const shouldShowCollapse = shifts.length > 3 || distinctPeople.length > 3;
  const displayedShifts = isCollapsed ? shifts.slice(0, 3) : shifts;
  const displayedPeople = isCollapsed ? distinctPeople.slice(0, 3) : distinctPeople;

  return (
    <div className="section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="section-title">Assign Shifts</div>
        {shouldShowCollapse && (
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="collapse-btn"
          >
            {isCollapsed ? (
              <>
                <i className="bi bi-chevron-down me-1"></i>
                Show All ({shifts.length} shifts, {distinctPeople.length} people)
              </>
            ) : (
              <>
                <i className="bi bi-chevron-up me-1"></i>
                Collapse
              </>
            )}
          </Button>
        )}
      </div>
      
      {showSuccess && (
        <Alert variant="success" dismissible onClose={() => setShowSuccess(false)}>
          Operation completed successfully!
        </Alert>
      )}
      
      {showError && (
        <Alert variant="danger" dismissible onClose={() => setShowError(false)}>
          {errorMessage}
        </Alert>
      )}

      <Row className="g-3 mb-4">
        <Col xs={12} md="auto">
          <Button className="btn-primary" onClick={() => setShowModal(true)}>
            Create New Shift
          </Button>
        </Col>
        <Col xs={12} md="auto">
          <Button variant="outline-primary" onClick={loadShifts}>
            Refresh Shifts
          </Button>
        </Col>
      </Row>

      {/* Shifts Overview */}
      <div className="mb-4">
        <h6 className="mb-3">Shifts Overview</h6>
        <Row className="g-3">
          {displayedShifts.map(shift => (
            <Col xs={6} md={3} key={shift.id}>
              <div className="metric-card">
                <div className="metric-value">
                  {peopleByShift[shift.name]?.length || 0}
                </div>
                <div className="metric-label">{shift.name}</div>
                <Button
                  size="sm"
                  variant="outline-danger"
                  className="mt-2"
                  onClick={() => handleDeleteShift(shift.id, shift.name)}
                >
                  Delete
                </Button>
              </div>
            </Col>
          ))}
          <Col xs={6} md={3}>
            <div className="metric-card">
              <div className="metric-value">
                {peopleByShift['Unassigned']?.length || 0}
              </div>
              <div className="metric-label">Unassigned</div>
            </div>
          </Col>
          {isCollapsed && shifts.length > 3 && (
            <Col xs={12}>
              <div className="text-center text-muted">
                <em>Showing 3 of {shifts.length} shifts. Click "Show All" to see the complete list.</em>
              </div>
            </Col>
          )}
        </Row>
      </div>

      {/* Shift Assignments Table */}
      <div className="table-responsive">
        <Table className="table">
          <thead>
            <tr>
              <th>Person Name</th>
              <th>Current Shift</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedPeople.map(person => (
              <tr key={person}>
                <td>{person}</td>
                <td>
                  <Form.Select
                    value={peopleToShift[person] || ''}
                    onChange={(e) => handleShiftAssignment(person, e.target.value)}
                    size="sm"
                  >
                    <option value="">Unassigned</option>
                    {shifts.map(shift => (
                      <option key={shift.id} value={shift.name}>
                        {shift.name}
                      </option>
                    ))}
                  </Form.Select>
                </td>
                <td>
                  <span className={`badge ${peopleToShift[person] ? 'bg-success' : 'bg-secondary'}`}>
                    {peopleToShift[person] || 'Unassigned'}
                  </span>
                </td>
              </tr>
            ))}
            {isCollapsed && distinctPeople.length > 3 && (
              <tr className="table-info">
                <td colSpan="3" className="text-center">
                  <em>Showing 3 of {distinctPeople.length} people. Click "Show All" to see the complete list.</em>
                </td>
              </tr>
            )}
            {distinctPeople.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-muted">
                  No people found. Please upload an Excel file first.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Create Shift Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Shift</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateShift}>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Shift Name</Form.Label>
              <Form.Control
                type="text"
                value={newShiftName}
                onChange={(e) => setNewShiftName(e.target.value)}
                placeholder="Enter shift name"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-primary">
              Create Shift
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}


