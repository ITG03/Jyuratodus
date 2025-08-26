import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Button, Col, Row, Table } from 'react-bootstrap';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { useApp } from '../context';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function downloadPng(node, fileName) {
  if (!node) return;
  toPng(node, { backgroundColor: '#ffffff', quality: 0.98 })
    .then(dataUrl => {
      const blob = fetch(dataUrl).then(res => res.blob());
      return blob;
    })
    .then(async bPromise => saveAs(await bPromise, fileName));
}

export default function Insights() {
  const { rows, peopleToGroup, peopleToShift } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const chartRefs = {
    perPerson: useRef(null),
    perGroup: useRef(null),
    perShift: useRef(null),
  };

  const metrics = useMemo(() => computeMetrics(rows, peopleToGroup, peopleToShift), [rows, peopleToGroup, peopleToShift]);

  // Auto-collapse when there are many data points
  useEffect(() => {
    const hasManyData = 
      Object.keys(metrics.perPerson).length > 3 ||
      Object.keys(metrics.perGroup).length > 3 ||
      Object.keys(metrics.perShift).length > 3 ||
      metrics.peopleRows.length > 3;
    
    if (hasManyData) {
      setIsCollapsed(true);
    }
  }, [metrics]);

  const barOptions = { responsive: true, plugins: { legend: { display: false } }, maintainAspectRatio: false };

  const shouldShowCollapse = 
    Object.keys(metrics.perPerson).length > 3 ||
    Object.keys(metrics.perGroup).length > 3 ||
    Object.keys(metrics.perShift).length > 3 ||
    metrics.peopleRows.length > 3;

  const displayedPeopleRows = isCollapsed ? metrics.peopleRows.slice(0, 3) : metrics.peopleRows;

  return (
    <div id="insights">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="section-title">Analytics Overview</div>
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
                Show All Data
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
      
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{metrics.totalTrucks}</div>
          <div className="metric-label">Total trucks weighed</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics.totalImpounded}</div>
          <div className="metric-label">Impounded trucks</div>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={6}>
          <div className="card-minimal p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="section-title mb-0">Trucks per person</div>
              <Button size="sm" className="btn-primary" onClick={() => downloadPng(chartRefs.perPerson.current, 'per-person.png')}>Download PNG</Button>
            </div>
            <div ref={chartRefs.perPerson} style={{ height: 320 }}>
              <Bar options={barOptions} data={{
                labels: isCollapsed ? Object.keys(metrics.perPerson).slice(0, 3) : Object.keys(metrics.perPerson),
                datasets: [{ 
                  label: 'Trucks', 
                  data: isCollapsed ? Object.values(metrics.perPerson).slice(0, 3) : Object.values(metrics.perPerson), 
                  backgroundColor: '#3b82f6' 
                }]
              }} />
            </div>
            {isCollapsed && Object.keys(metrics.perPerson).length > 3 && (
              <div className="text-center text-muted mt-2">
                <em>Showing top 3 of {Object.keys(metrics.perPerson).length} people</em>
              </div>
            )}
          </div>
        </Col>

        <Col lg={6}>
          <div className="card-minimal p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="section-title mb-0">Trucks per group</div>
              <Button size="sm" className="btn-primary" onClick={() => downloadPng(chartRefs.perGroup.current, 'per-group.png')}>Download PNG</Button>
            </div>
            <div ref={chartRefs.perGroup} style={{ height: 320 }}>
              <Bar options={barOptions} data={{
                labels: isCollapsed ? Object.keys(metrics.perGroup).slice(0, 3) : Object.keys(metrics.perGroup),
                datasets: [{ 
                  label: 'Trucks', 
                  data: isCollapsed ? Object.values(metrics.perGroup).slice(0, 3) : Object.values(metrics.perGroup), 
                  backgroundColor: '#10b981' 
                }]
              }} />
            </div>
            {isCollapsed && Object.keys(metrics.perGroup).length > 3 && (
              <div className="text-center text-muted mt-2">
                <em>Showing top 3 of {Object.keys(metrics.perGroup).length} groups</em>
              </div>
            )}
          </div>
        </Col>

        <Col lg={6}>
          <div className="card-minimal p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="section-title mb-0">Trucks per shift</div>
              <Button size="sm" className="btn-primary" onClick={() => downloadPng(chartRefs.perShift.current, 'per-shift.png')}>Download PNG</Button>
            </div>
            <div ref={chartRefs.perShift} style={{ height: 320 }}>
              <Doughnut data={{
                labels: isCollapsed ? Object.keys(metrics.perShift).slice(0, 3) : Object.keys(metrics.perShift),
                datasets: [{ 
                  data: isCollapsed ? Object.values(metrics.perShift).slice(0, 3) : Object.values(metrics.perShift), 
                  backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'] 
                }]
              }} />
            </div>
            {isCollapsed && Object.keys(metrics.perShift).length > 3 && (
              <div className="text-center text-muted mt-2">
                <em>Showing top 3 of {Object.keys(metrics.perShift).length} shifts</em>
              </div>
            )}
          </div>
        </Col>

        <Col lg={6}>
          <div className="card-minimal p-4 h-100">
            <div className="section-title mb-3">Summary table</div>
            <Table responsive size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Group</th>
                  <th>Shift</th>
                  <th>Trucks</th>
                  <th>Impounded</th>
                </tr>
              </thead>
              <tbody>
                {displayedPeopleRows.map(r => (
                  <tr key={r.person}>
                    <td>{r.person}</td>
                    <td>{r.group || '-'}</td>
                    <td>{r.shift || '-'}</td>
                    <td>{r.trucks}</td>
                    <td>{r.impounded}</td>
                  </tr>
                ))}
                {isCollapsed && metrics.peopleRows.length > 3 && (
                  <tr className="table-info">
                    <td colSpan="5" className="text-center">
                      <em>Showing 3 of {metrics.peopleRows.length} people. Click "Show All Data" to see the complete list.</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>
    </div>
  );
}

function computeMetrics(rows, peopleToGroup, peopleToShift) {
  const perPersonCounts = {};
  const perPersonImpounded = {};
  const perGroupCounts = {};
  const perShiftCounts = {};
  let total = 0;
  let totalImpounded = 0;

  for (const r of rows) {
    const person = String(r.person || 'Unknown').trim();
    const group = peopleToGroup[person] || 'Unassigned';
    const shift = peopleToShift[person] || 'Unassigned';
    total += 1;
    perPersonCounts[person] = (perPersonCounts[person] || 0) + 1;
    perGroupCounts[group] = (perGroupCounts[group] || 0) + 1;
    perShiftCounts[shift] = (perShiftCounts[shift] || 0) + 1;
    if (r.impounded) {
      totalImpounded += 1;
      perPersonImpounded[person] = (perPersonImpounded[person] || 0) + 1;
    }
  }

  const peopleRows = Object.keys(perPersonCounts).sort().map(p => ({
    person: p,
    group: peopleToGroup[p] || 'Unassigned',
    shift: peopleToShift[p] || 'Unassigned',
    trucks: perPersonCounts[p] || 0,
    impounded: perPersonImpounded[p] || 0,
  }));

  return {
    totalTrucks: total,
    totalImpounded,
    perPerson: perPersonCounts,
    perGroup: perGroupCounts,
    perShift: perShiftCounts,
    peopleRows,
  };
}


