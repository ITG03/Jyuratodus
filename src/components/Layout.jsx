import React, { useState } from 'react';
import { Navbar, Container, Button, Offcanvas } from 'react-bootstrap';
import Sidebar from './Sidebar';
import { FaMoon, FaSun, FaBars, FaTruck } from 'react-icons/fa';

export default function Layout({ theme, toggleTheme, children }) {
  const [showMobileNav, setShowMobileNav] = useState(false);

  const closeNav = () => setShowMobileNav(false);
  const openNav = () => setShowMobileNav(true);

  return (
    <div className="app-shell d-flex">
      {/* Desktop sidebar */}
      <div className="d-none d-md-block"><Sidebar /></div>

      {/* Mobile offcanvas sidebar */}
      <Offcanvas show={showMobileNav} onHide={closeNav} responsive="md" className="d-md-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Sidebar onNavigate={closeNav} />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="app-main flex-grow-1">
        <Navbar expand="lg" className="mb-0 navbar-modern border-bottom">
          <Container fluid>
            <div className="d-flex align-items-center">
              <Button variant="outline-secondary" size="sm" className="d-md-none me-2" onClick={openNav} aria-label="Open menu">
                <FaBars />
              </Button>
              {/* Mobile brand/title */}
              <div className="d-md-none small-brand d-flex align-items-center fw-bold">
                <span>Mwila ShiftBoss</span>
              </div>
            </div>
            <div className="ms-auto d-flex align-items-center">
              <Button variant="outline-secondary" size="sm" onClick={toggleTheme}>
                {theme === 'light' ? (<><FaMoon className="me-1" /> Dark</>) : (<><FaSun className="me-1" /> Light</>)}
              </Button>
            </div>
          </Container>
        </Navbar>
        <div className="content px-3 py-3">
          {children}
        </div>
      </div>
    </div>
  );
}