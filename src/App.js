import './App.css';
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Upload from './components/Upload';
import Insights from './components/Insights';
import PeopleManagement from './components/PeopleManagement';
import ManageGroups from './components/ManageGroups';
import AssignShifts from './components/AssignShifts';
import DataImport from './components/DataImport';
import DataExport from './components/DataExport';

function ManagementHub() {
  // Simple hub page combining sections (can be improved to master-detail later)
  return (
    <div className="management-container">
      <div className="modern-card content-card mb-3">
        <div className="card-header-modern">
          <h3 className="card-title">Shifts</h3>
          <p className="card-description">Assign and manage work shifts</p>
        </div>
        <div className="card-content"><AssignShifts /></div>
      </div>
      <div className="modern-card content-card mb-3">
        <div className="card-header-modern">
          <h3 className="card-title">Groups</h3>
          <p className="card-description">Organize people into groups</p>
        </div>
        <div className="card-content"><ManageGroups /></div>
      </div>
      <div className="modern-card content-card">
        <div className="card-header-modern">
          <h3 className="card-title">People Management</h3>
          <p className="card-description">Add, edit, and organize team members</p>
        </div>
        <div className="card-content"><PeopleManagement /></div>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('app_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    const root = document.documentElement;
    if (initial === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('app_theme', next);
    const root = document.documentElement;
    if (next === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout theme={theme} toggleTheme={toggleTheme} />}> 
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/analytics" element={<Insights />} />
          <Route path="/management" element={<ManagementHub />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/export" element={<DataExport />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
