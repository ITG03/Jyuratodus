import './App.css';
import React from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import Upload from './components/Upload';
import PeopleManagement from './components/PeopleManagement';
import ManageGroups from './components/ManageGroups';
import AssignShifts from './components/AssignShifts';
import Insights from './components/Insights';
import DataExport from './components/DataExport';
import DataImport from './components/DataImport';

function App() {
  return (
    <div>
      <Navbar expand="md" className="mb-4 navbar-clean">
        <Container>
          <Navbar.Brand className="fw-bold">Weighbridge Analytics</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="#upload">Upload</Nav.Link>
              <Nav.Link href="#people">People</Nav.Link>
              <Nav.Link href="#manage">Groups</Nav.Link>
              <Nav.Link href="#shifts">Shifts</Nav.Link>
              <Nav.Link href="#insights">Insights</Nav.Link>
              <Nav.Link href="#import">Import</Nav.Link>
              <Nav.Link href="#export">Export</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="pb-5">
        <div className="section">
          <Upload />
        </div>
        <div className="section">
          <PeopleManagement />
        </div>
        <div className="section">
          <ManageGroups />
        </div>
        <div className="section">
          <AssignShifts />
        </div>
        <div className="section">
          <Insights />
        </div>
        <div className="section">
          <DataImport />
        </div>
        <div className="section">
          <DataExport />
        </div>
      </Container>
    </div>
  );
}

export default App;
