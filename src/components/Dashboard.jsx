import React, { useState } from 'react';
import { Tabs, Tab, Nav } from 'react-bootstrap';
import Upload from './Upload';
import PeopleManagement from './PeopleManagement';
import ManageGroups from './ManageGroups';
import AssignShifts from './AssignShifts';
import Insights from './Insights';
import DataImport from './DataImport';
import DataExport from './DataExport';

export default function Dashboard({ activeKey: controlledActiveKey, onSelect: controlledOnSelect }) {
  // Support controlled usage from parent (App) or fallback to internal state
  const [mainKeyState, setMainKeyState] = useState('upload');
  const mainKey = controlledActiveKey !== undefined ? controlledActiveKey : mainKeyState;
  const setMainKey = controlledOnSelect !== undefined ? controlledOnSelect : setMainKeyState;
  const [managementKey, setManagementKey] = useState('shifts');

  const tabConfig = [
    { 
      key: 'upload', 
      title: '📊 Upload', 
      icon: '📊',
      component: <Upload />,
      description: 'Upload and process Excel files'
    },
    { 
      key: 'analytics', 
      title: '📈 Analytics', 
      icon: '📈',
      component: <Insights />,
      description: 'View data insights and reports'
    },
    { 
      key: 'management', 
      title: '👥 Management', 
      icon: '👥',
      component: null,
      description: 'Manage people, groups and shifts'
    },
    { 
      key: 'import', 
      title: '📥 Import', 
      icon: '📥',
      component: <DataImport />,
      description: 'Import data from external sources'
    },
    { 
      key: 'export', 
      title: '📤 Export', 
      icon: '📤',
      component: <DataExport />,
      description: 'Export data and reports'
    }
  ];

  const managementTabs = [
    {
      key: 'shifts',
      title: '⏰ Shifts',
      icon: '⏰',
      component: <AssignShifts />,
      description: 'Assign and manage work shifts'
    },
    {
      key: 'groups',
      title: '🏢 Groups',
      icon: '🏢',
      component: <ManageGroups />,
      description: 'Organize people into groups'
    },
    {
      key: 'assignments',
      title: '📋 Assignments',
      icon: '📋',
      component: <AssignShifts />,
      description: 'View all assignments'
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Main navigation tabs */}
      <div className="dashboard-tabs-modern">
        <Tabs activeKey={mainKey} onSelect={(k) => setMainKey(k)} className="mb-4" mountOnEnter unmountOnExit>
          {tabConfig.map(tab => (
            <Tab 
              key={tab.key}
              eventKey={tab.key} 
              title={
                <span className="tab-title-modern">
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-text">{tab.title.replace(tab.icon + ' ', '')}</span>
                </span>
              }
            >
              {tab.key === 'management' ? (
                <div className="management-container">
                  <div className="container-header">
                    <h2 className="section-title-modern">
                      <span className="title-icon">👥</span>
                      Team Management Hub
                    </h2>
                    <p className="section-description">Organize your workforce efficiently with groups, shifts, and assignments</p>
                  </div>
                  
                  {/* Management subtabs */}
                  <div className="subtabs-modern">
                    <Tabs activeKey={managementKey} onSelect={(k) => setManagementKey(k)} className="mb-4" mountOnEnter unmountOnExit>
                      {managementTabs.map(subTab => (
                        <Tab 
                          key={subTab.key}
                          eventKey={subTab.key} 
                          title={
                            <span className="subtab-title-modern">
                              <span className="subtab-icon">{subTab.icon}</span>
                              <span className="subtab-text">{subTab.title.replace(subTab.icon + ' ', '')}</span>
                            </span>
                          }
                        >
                          <div className="modern-card content-card">
                            <div className="card-header-modern">
                              <h3 className="card-title">
                                <span className="card-title-icon">{subTab.icon}</span>
                                {subTab.title.replace(subTab.icon + ' ', '')}
                              </h3>
                              <p className="card-description">{subTab.description}</p>
                            </div>
                            <div className="card-content">
                              {subTab.component}
                            </div>
                          </div>
                        </Tab>
                      ))}
                    </Tabs>
                  </div>
                  
                  {/* People Management section */}
                  <div className="mt-4">
                    <div className="modern-card content-card">
                      <div className="card-header-modern">
                        <h3 className="card-title">
                          <span className="card-title-icon">👤</span>
                          People Management
                        </h3>
                        <p className="card-description">Add, edit, and organize team members</p>
                      </div>
                      <div className="card-content">
                        <PeopleManagement />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="modern-card content-card">
                  <div className="card-header-modern">
                    <h2 className="card-title">
                      <span className="card-title-icon">{tab.icon}</span>
                      {tab.title.replace(tab.icon + ' ', '')}
                    </h2>
                    <p className="card-description">{tab.description}</p>
                  </div>
                  <div className="card-content">
                    {tab.component}
                  </div>
                </div>
              )}
            </Tab>
          ))}
        </Tabs>
      </div>
    </div>
  );
}