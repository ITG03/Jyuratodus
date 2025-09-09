import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaUpload, FaChartLine, FaUsers, FaFileImport, FaDownload, FaCogs } from 'react-icons/fa';

export default function Sidebar({ onNavigate }) {
  // react-router's useLocation might not be exported in older/newer versions used here.
  // Fallback to window.location.pathname to preserve highlighting behavior without changing functionality.
  const pathname = (typeof window !== 'undefined' && window.location && window.location.pathname) || '/';

  const items = [
    { to: '/upload', label: 'Upload', icon: <FaUpload /> },
    { to: '/analytics', label: 'Analytics', icon: <FaChartLine /> },
    { to: '/management', label: 'Management', icon: <FaUsers /> },
    { to: '/import', label: 'Import', icon: <FaFileImport /> },
    { to: '/export', label: 'Export', icon: <FaDownload /> },
    { to: '/settings', label: 'Settings', icon: <FaCogs /> },
  ];

  const handleClick = () => {
    if (typeof onNavigate === 'function') onNavigate();
  };

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-header">
        <div className="fw-bold">Mwila ShiftBoss <span className="brand-badge ms-1">Pro</span></div>
      </div>
      <Nav className="flex-column sidebar-nav p-2">
        {items.map(item => (
          <Nav.Item key={item.to} className="my-1">
            <Nav.Link
              as={Link}
              to={item.to}
              onClick={handleClick}
              className={`sidebar-link d-flex align-items-center ${pathname.startsWith(item.to) ? 'active' : ''}`}
              aria-current={pathname.startsWith(item.to) ? 'page' : undefined}
            >
              <span className="me-2">{item.icon}</span>
              <span>{item.label}</span>
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
    </aside>
  );
}