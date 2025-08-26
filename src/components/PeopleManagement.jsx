import React, { useState, useEffect } from 'react';
import { Button, Col, Row, Form, Alert, Table, Modal } from 'react-bootstrap';
import db from '../database';

export default function PeopleManagement() {
  const [people, setPeople] = useState([]);
  const [groups, setGroups] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    group: '',
    shift: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-collapse when more than 3 people
  useEffect(() => {
    if (people.length > 3) {
      setIsCollapsed(true);
    }
  }, [people.length]);

  async function loadData() {
    try {
      const [peopleData, groupsData, shiftsData] = await Promise.all([
        db.getAllPeople(),
        db.getAllGroups(),
        db.getAllShifts()
      ]);
      
      setPeople(peopleData);
      setGroups(groupsData);
      setShifts(shiftsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setErrorMessage('Failed to load data from database');
      setShowError(true);
    }
  }

  function handleShowModal(person = null) {
    if (person) {
      setEditingPerson(person);
      setFormData({
        name: person.name,
        group: person.group,
        shift: person.shift
      });
    } else {
      setEditingPerson(null);
      setFormData({ name: '', group: '', shift: '' });
    }
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingPerson(null);
    setFormData({ name: '', group: '', shift: '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setErrorMessage('Name is required');
      setShowError(true);
      return;
    }

    try {
      if (editingPerson) {
        // Update existing person
        await db.updatePerson(editingPerson.id, {
          name: formData.name,
          group: formData.group,
          shift: formData.shift
        });
      } else {
        // Add new person (check for duplicates)
        await db.addPersonIfNotExists(formData.name, formData.group, formData.shift);
      }
      
      await loadData();
      handleCloseModal();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save person:', error);
      setErrorMessage(`Failed to save person: ${error.message}`);
      setShowError(true);
    }
  }

  async function handleDeletePerson(id) {
    if (window.confirm('Are you sure you want to delete this person?')) {
      try {
        await db.deletePerson(id);
        await loadData();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (error) {
        console.error('Failed to delete person:', error);
        setErrorMessage('Failed to delete person');
        setShowError(true);
      }
    }
  }

  async function addDefaultGroups() {
    const defaultGroups = ['Team A', 'Team B', 'Team C', 'Management'];
    try {
      for (const groupName of defaultGroups) {
        await db.addGroup(groupName);
      }
      await loadData();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to add default groups:', error);
    }
  }

  async function addDefaultShifts() {
    const defaultShifts = ['Morning', 'Afternoon', 'Night'];
    try {
      for (const shiftName of defaultShifts) {
        await db.addShift(shiftName);
      }
      await loadData();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to add default shifts:', error);
    }
  }

  const shouldShowCollapse = people.length > 3;
  const displayedPeople = isCollapsed ? people.slice(0, 3) : people;

  return (
    <div className="section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="section-title">People Management</div>
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
                Show All ({people.length})
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
          <Button className="btn-primary" onClick={() => handleShowModal()}>
            Add New Person
          </Button>
        </Col>
        <Col xs={12} md="auto">
          <Button variant="outline-secondary" onClick={addDefaultGroups}>
            Add Default Groups
          </Button>
        </Col>
        <Col xs={12} md="auto">
          <Button variant="outline-secondary" onClick={addDefaultShifts}>
            Add Default Shifts
          </Button>
        </Col>
        <Col xs={12} md="auto">
          <Button variant="outline-primary" onClick={loadData}>
            Refresh Data
          </Button>
        </Col>
      </Row>

      <div className="table-responsive">
        <Table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Shift</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedPeople.map(person => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>
                  <span className={`badge ${person.group ? 'bg-primary' : 'bg-secondary'}`}>
                    {person.group || 'Unassigned'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${person.shift ? 'bg-success' : 'bg-secondary'}`}>
                    {person.shift || 'Unassigned'}
                  </span>
                </td>
                <td>{new Date(person.createdAt).toLocaleDateString()}</td>
                <td>
                  <Button 
                    size="sm" 
                    variant="outline-primary" 
                    className="me-2"
                    onClick={() => handleShowModal(person)}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline-danger"
                    onClick={() => handleDeletePerson(person.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {isCollapsed && people.length > 3 && (
              <tr className="table-info">
                <td colSpan="5" className="text-center">
                  <em>Showing 3 of {people.length} people. Click "Show All" to see the complete list.</em>
                </td>
              </tr>
            )}
            {people.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted">
                  No people added yet. Click "Add New Person" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Add/Edit Person Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingPerson ? 'Edit Person' : 'Add New Person'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Label>Full Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Group</Form.Label>
                <Form.Select
                  value={formData.group}
                  onChange={e => setFormData({ ...formData, group: e.target.value })}
                >
                  <option value="">Select Group</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Shift</Form.Label>
                <Form.Select
                  value={formData.shift}
                  onChange={e => setFormData({ ...formData, shift: e.target.value })}
                >
                  <option value="">Select Shift</option>
                  {shifts.map(shift => (
                    <option key={shift.id} value={shift.name}>
                      {shift.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" className="btn-primary">
              {editingPerson ? 'Update Person' : 'Add Person'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Summary Cards */}
      <Row className="g-3 mt-4">
        <Col xs={6} md={3}>
          <div className="metric-card">
            <div className="metric-value">{people.length}</div>
            <div className="metric-label">Total People</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="metric-card">
            <div className="metric-value">{groups.length}</div>
            <div className="metric-label">Groups</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="metric-card">
            <div className="metric-value">{shifts.length}</div>
            <div className="metric-label">Shifts</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="metric-card">
            <div className="metric-value">
              {people.filter(p => p.group && p.shift).length}
            </div>
            <div className="metric-label">Fully Assigned</div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
