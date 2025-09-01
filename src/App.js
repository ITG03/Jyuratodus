import './App.css';
import React, { useState } from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import Dashboard from './components/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  return (
    <div className="app-container">
      <Navbar expand="lg" className="mb-4 navbar-modern">
        <Container>
          <Navbar.Brand className="brand-modern">
            <span className="brand-icon">🚛</span>
            <span className="brand-text">Mwila ShiftBoss</span>
            <span className="brand-badge">Pro</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto nav-modern">
              <Nav.Link onClick={(e) => { e.preventDefault(); setActiveTab('upload'); }} href="#upload" className="nav-item-modern">
                <span className="nav-icon">📊</span>
                Upload
              </Nav.Link>
              <Nav.Link onClick={(e) => { e.preventDefault(); setActiveTab('analytics'); }} href="#analytics" className="nav-item-modern">
                <span className="nav-icon">📈</span>
                Analytics
              </Nav.Link>
              <Nav.Link onClick={(e) => { e.preventDefault(); setActiveTab('management'); }} href="#management" className="nav-item-modern">
                <span className="nav-icon">👥</span>
                Management
              </Nav.Link>
              <Nav.Link onClick={(e) => { e.preventDefault(); setActiveTab('import'); }} href="#import" className="nav-item-modern">
                <span className="nav-icon">📥</span>
                Import
              </Nav.Link>
              <Nav.Link onClick={(e) => { e.preventDefault(); setActiveTab('export'); }} href="#export" className="nav-item-modern">
                <span className="nav-icon">📤</span>
                Export
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="pb-5 main-container">
        <Dashboard activeKey={activeTab} onSelect={setActiveTab} />
      </Container>
    </div>
  );
}

export default App;
