import React, { useState, useEffect } from 'react';
import { Button, Col, Row, Form, Alert, Table, Modal } from 'react-bootstrap';
import { useApp } from '../context';
import db from '../database';

export default function ManageGroups() {
  const { rows, peopleToGroup, setPeopleToGroup, distinctPeople } = useApp();
  const [groups, setGroups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  // Auto-collapse when more than 3 groups or people
  useEffect(() => {
    if (groups.length > 3 || distinctPeople.length > 3) {
      setIsCollapsed(true);
    }
  }, [groups.length, distinctPeople.length]);

  async function loadGroups() {
    try {
      const groupsData = await db.getAllGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    
    if (!newGroupName.trim()) {
      setErrorMessage('Group name is required');
      setShowError(true);
      return;
    }

    try {
      await db.addGroup(newGroupName.trim());
      await loadGroups();
      setNewGroupName('');
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to create group:', error);
      setErrorMessage(`Failed to create group: ${error.message}`);
      setShowError(true);
    }
  }

  async function handleDeleteGroup(groupId, groupName) {
    if (window.confirm(`Are you sure you want to delete the group "${groupName}"? This will unassign all people from this group.`)) {
      try {
        // Remove group assignments for this group
        const updatedAssignments = { ...peopleToGroup };
        Object.keys(updatedAssignments).forEach(person => {
          if (updatedAssignments[person] === groupName) {
            updatedAssignments[person] = '';
          }
        });
        await setPeopleToGroup(updatedAssignments);

        // Delete the group from database
        await db.deleteGroup(groupId);
        await loadGroups();
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (error) {
        console.error('Failed to delete group:', error);
        setErrorMessage('Failed to delete group');
        setShowError(true);
      }
    }
  }

  async function handleGroupAssignment(person, groupName) {
    const updated = { ...peopleToGroup };
    updated[person] = groupName;
    await setPeopleToGroup(updated);
  }

  // Get people grouped by their assigned group
  const peopleByGroup = {};
  distinctPeople.forEach(person => {
    const group = peopleToGroup[person] || 'Unassigned';
    if (!peopleByGroup[group]) {
      peopleByGroup[group] = [];
    }
    peopleByGroup[group].push(person);
  });

  const shouldShowCollapse = groups.length > 3 || distinctPeople.length > 3;
  const displayedGroups = isCollapsed ? groups.slice(0, 3) : groups;
  const displayedPeople = isCollapsed ? distinctPeople.slice(0, 3) : distinctPeople;

  return (
    <div className="section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="section-title">Manage Groups</div>
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
                Show All ({groups.length} groups, {distinctPeople.length} people)
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
            Create New Group
          </Button>
        </Col>
        <Col xs={12} md="auto">
          <Button variant="outline-primary" onClick={loadGroups}>
            Refresh Groups
          </Button>
        </Col>
      </Row>

      {/* Groups Overview */}
      <div className="mb-4">
        <h6 className="mb-3">Groups Overview</h6>
        <Row className="g-3">
          {displayedGroups.map(group => (
            <Col xs={6} md={3} key={group.id}>
              <div className="metric-card">
                <div className="metric-value">
                  {peopleByGroup[group.name]?.length || 0}
                </div>
                <div className="metric-label">{group.name}</div>
                <Button
                  size="sm"
                  variant="outline-danger"
                  className="mt-2"
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                >
                  Delete
                </Button>
              </div>
            </Col>
          ))}
          <Col xs={6} md={3}>
            <div className="metric-card">
              <div className="metric-value">
                {peopleByGroup['Unassigned']?.length || 0}
              </div>
              <div className="metric-label">Unassigned</div>
            </div>
          </Col>
          {isCollapsed && groups.length > 3 && (
            <Col xs={12}>
              <div className="text-center text-muted">
                <em>Showing 3 of {groups.length} groups. Click "Show All" to see the complete list.</em>
              </div>
            </Col>
          )}
        </Row>
      </div>

      {/* Group Assignments Table */}
      <div className="table-responsive">
        <Table className="table">
          <thead>
            <tr>
              <th>Person Name</th>
              <th>Current Group</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedPeople.map(person => (
              <tr key={person}>
                <td>{person}</td>
                <td>
                  <Form.Select
                    value={peopleToGroup[person] || ''}
                    onChange={(e) => handleGroupAssignment(person, e.target.value)}
                    size="sm"
                  >
                    <option value="">Unassigned</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.name}>
                        {group.name}
                      </option>
                    ))}
                  </Form.Select>
                </td>
                <td>
                  <span className={`badge ${peopleToGroup[person] ? 'bg-primary' : 'bg-secondary'}`}>
                    {peopleToGroup[person] || 'Unassigned'}
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

      {/* Create Group Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Group</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateGroup}>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Group Name</Form.Label>
              <Form.Control
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-primary">
              Create Group
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}


