import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Button, Col, Row, Table, Card, Tabs, Tab, Badge, ProgressBar, Alert } from 'react-bootstrap';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { useApp } from '../context';
import RevenueAnalytics from './RevenueAnalytics';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement);

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
  const [activeTab, setActiveTab] = useState('overview');
  const chartRefs = {
    perPerson: useRef(null),
    perGroup: useRef(null),
    perShift: useRef(null),
    trends: useRef(null),
    performance: useRef(null),
    impounded: useRef(null),
  };

  const analytics = useMemo(() => computeAdvancedAnalytics(rows, peopleToGroup, peopleToShift), [rows, peopleToGroup, peopleToShift]);

  // Auto-collapse when there are many data points
  useEffect(() => {
    const hasManyData = 
      Object.keys(analytics.basic.perPerson).length > 3 ||
      Object.keys(analytics.basic.perGroup).length > 3 ||
      Object.keys(analytics.basic.perShift).length > 3 ||
      analytics.basic.peopleRows.length > 3;
    
    if (hasManyData) {
      setIsCollapsed(true);
    }
  }, [analytics]);

  const barOptions = { 
    responsive: true, 
    plugins: { legend: { display: false } }, 
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Trend Analysis'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const shouldShowCollapse = 
    Object.keys(analytics.basic.perPerson).length > 3 ||
    Object.keys(analytics.basic.perGroup).length > 3 ||
    Object.keys(analytics.basic.perShift).length > 3 ||
    analytics.basic.peopleRows.length > 3;

  const displayedPeopleRows = isCollapsed ? analytics.basic.peopleRows.slice(0, 3) : analytics.basic.peopleRows;

  return (
    <div id="insights">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="section-title">Advanced Analytics Dashboard</div>
        {shouldShowCollapse && (
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="collapse-btn"
          >
            {isCollapsed ? (
              <>
                <span className="me-1">▼</span>
                Show All Data
              </>
            ) : (
              <>
                <span className="me-1">▲</span>
                Collapse
              </>
            )}
          </Button>
        )}
      </div>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="overview" title={<><span className="me-2">📊</span>Overview</>}>
          {/* Key Performance Metrics */}
          <div className="metrics-grid mb-4">
            <div className="metric-card">
              <div className="metric-value">{analytics.basic.totalTrucks.toLocaleString()}</div>
              <div className="metric-label">Total Trucks Weighed</div>
              <div className="metric-change">
                {analytics.stats.avgTrucksPerPerson > 0 && (
                  <small className="text-muted">Avg: {analytics.stats.avgTrucksPerPerson.toFixed(1)} per person</small>
                )}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-value text-danger">{analytics.basic.totalImpounded}</div>
              <div className="metric-label">Impounded Trucks</div>
              <div className="metric-change">
                <Badge bg={analytics.stats.impoundedRate > 10 ? 'danger' : analytics.stats.impoundedRate > 5 ? 'warning' : 'success'}>
                  {analytics.stats.impoundedRate.toFixed(1)}% rate
                </Badge>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-value">{analytics.stats.uniquePeople}</div>
              <div className="metric-label">Active Personnel</div>
              <div className="metric-change">
                <small className="text-muted">In {Object.keys(analytics.basic.perGroup).length} groups</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-value">{analytics.stats.topPerformer.trucks || 0}</div>
              <div className="metric-label">Top Performer</div>
              <div className="metric-change">
                <small className="text-muted">{analytics.stats.topPerformer.name || 'N/A'}</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-value">{(analytics.basic.totalRevenue || 0).toLocaleString()}</div>
              <div className="metric-label">Total Revenue</div>
              <div className="metric-change">
                <small className="text-muted">Top earner: {analytics.stats.topRevenuePerformer.name || 'N/A'}</small>
              </div>
            </div>
          </div>

          {/* Performance Alerts */}
          {analytics.alerts.length > 0 && (
            <div className="mb-4">
              <h5 className="mb-3">Performance Alerts</h5>
              {analytics.alerts.map((alert, idx) => (
                <Alert key={idx} variant={alert.type} className="d-flex align-items-center">
                  <span className="me-2">{alert.type === 'danger' ? '⚠️' : alert.type === 'warning' ? '📊' : 'ℹ️'}</span>
                  <div>
                    <strong>{alert.title}</strong>
                    <div>{alert.message}</div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Main Charts */}
          <Row className="g-4">
            <Col lg={6}>
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Performance by Person</h5>
                  <Button size="sm" variant="outline-primary" onClick={() => downloadPng(chartRefs.perPerson.current, 'performance-by-person.png')}>
                    📥 Export
                  </Button>
                </Card.Header>
                <Card.Body>
                  <div ref={chartRefs.perPerson} style={{ height: 300 }}>
                    <Bar options={barOptions} data={{
                      labels: isCollapsed ? Object.keys(analytics.basic.perPerson).slice(0, 5) : Object.keys(analytics.basic.perPerson),
                      datasets: [{ 
                        label: 'Trucks Weighed', 
                        data: isCollapsed ? Object.values(analytics.basic.perPerson).slice(0, 5) : Object.values(analytics.basic.perPerson), 
                        backgroundColor: '#0891b2',
                        borderColor: '#0891b2',
                        borderWidth: 1
                      }]
                    }} />
                  </div>
                  {isCollapsed && Object.keys(analytics.basic.perPerson).length > 5 && (
                    <div className="text-center text-muted mt-2">
                      <em>Showing top 5 of {Object.keys(analytics.basic.perPerson).length} personnel</em>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Group Distribution</h5>
                  <Button size="sm" variant="outline-primary" onClick={() => downloadPng(chartRefs.perGroup.current, 'group-distribution.png')}>
                    📥 Export
                  </Button>
                </Card.Header>
                <Card.Body>
                  <div ref={chartRefs.perGroup} style={{ height: 300 }}>
                    <Doughnut data={{
                      labels: Object.keys(analytics.basic.perGroup),
                      datasets: [{ 
                        data: Object.values(analytics.basic.perGroup), 
                        backgroundColor: ['#10b981', '#f59e0b', '#8b5cf6', '#0891b2', '#ef4444', '#06b6d4', '#f97316', '#84cc16'],
                        borderWidth: 2,
                        borderColor: '#fff'
                      }]
                    }} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                        }
                      }
                    }} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="detailed" title={<><span className="me-2">📈</span>Detailed Analysis</>}>
          <Row className="g-4">
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Shift Performance Analysis</h5>
                </Card.Header>
                <Card.Body>
                  <div ref={chartRefs.perShift} style={{ height: 350 }}>
                    <Bar 
                      options={{
                        ...barOptions,
                        plugins: {
                          legend: { display: true, position: 'top' },
                          title: {
                            display: true,
                            text: 'Trucks Processed by Shift'
                          }
                        }
                      }} 
                      data={{
                        labels: Object.keys(analytics.basic.perShift),
                        datasets: [
                          { 
                            label: 'Total Trucks',
                            data: Object.values(analytics.basic.perShift),
                            backgroundColor: '#10b981',
                            borderColor: '#10b981',
                            borderWidth: 1
                          },
                          {
                            label: 'Impounded',
                            data: Object.keys(analytics.basic.perShift).map(shift => analytics.impoundedByShift[shift] || 0),
                            backgroundColor: '#ef4444',
                            borderColor: '#ef4444',
                            borderWidth: 1
                          }
                        ]
                      }} 
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Performance Metrics</h6>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small>Most Productive Group</small>
                      <small className="text-muted">{analytics.stats.topGroup.name || 'N/A'}</small>
                    </div>
                    <ProgressBar 
                      now={analytics.stats.topGroup.percentage || 0} 
                      variant="success" 
                      style={{ height: '6px' }}
                    />
                    <div className="text-end">
                      <small className="text-muted">{analytics.stats.topGroup.trucks || 0} trucks</small>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small>Average per Person</small>
                      <small className="text-muted">{analytics.stats.avgTrucksPerPerson.toFixed(1)}</small>
                    </div>
                    <ProgressBar 
                      now={(analytics.stats.avgTrucksPerPerson / Math.max(...Object.values(analytics.basic.perPerson))) * 100} 
                      variant="info" 
                      style={{ height: '6px' }}
                    />
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small>Quality Score</small>
                      <small className="text-muted">{(100 - analytics.stats.impoundedRate).toFixed(1)}%</small>
                    </div>
                    <ProgressBar 
                      now={100 - analytics.stats.impoundedRate} 
                      variant={analytics.stats.impoundedRate > 10 ? 'danger' : analytics.stats.impoundedRate > 5 ? 'warning' : 'success'} 
                      style={{ height: '6px' }}
                    />
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>
                  <h6 className="mb-0">Top Performers</h6>
                </Card.Header>
                <Card.Body>
                  {analytics.basic.peopleRows
                    .sort((a, b) => b.trucks - a.trucks)
                    .slice(0, 5)
                    .map((person, idx) => (
                      <div key={person.person} className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <span className="badge bg-primary me-2">#{idx + 1}</span>
                          <strong>{person.person}</strong>
                          <div>
                            <small className="text-muted">
                              {person.group || 'Unassigned'} • {person.shift || 'No shift'}
                            </small>
                          </div>
                        </div>
                        <div className="text-end">
                          <div><strong>{person.trucks}</strong> trucks</div>
                          {person.impounded > 0 && (
                            <small className="text-danger">{person.impounded} impounded</small>
                          )}
                        </div>
                      </div>
                    ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="trends" title={<><span className="me-2">📉</span>Trends</>}>
          {analytics.trends && analytics.trends.dates.length > 1 ? (
            <Row className="g-4">
              <Col lg={12}>
                <Card>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Daily Activity Trends</h5>
                    <Button size="sm" variant="outline-primary" onClick={() => downloadPng(chartRefs.trends.current, 'daily-trends.png')}>
                      📥 Export
                    </Button>
                  </Card.Header>
                  <Card.Body>
                    <div ref={chartRefs.trends} style={{ height: 400 }}>
                      <Line
                        options={lineOptions}
                        data={{
                          labels: analytics.trends.dates,
                          datasets: [
                            {
                              label: 'Trucks Processed',
                              data: analytics.trends.dailyCounts,
                              borderColor: '#0891b2',
                              backgroundColor: 'rgba(8, 145, 178, 0.1)',
                              tension: 0.4,
                              fill: true
                            },
                            {
                              label: 'Impounded',
                              data: analytics.trends.dailyImpounded,
                              borderColor: '#ef4444',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              tension: 0.4,
                              fill: false
                            }
                          ]
                        }}
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          ) : (
            <Alert variant="info">
              <Alert.Heading>Trends Analysis</Alert.Heading>
              <p>Trend analysis requires data spanning multiple days. Upload more data to see detailed trends.</p>
            </Alert>
          )}
        </Tab>

        <Tab eventKey="summary" title={<><span className="me-2">📋</span>Summary Table</>}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Detailed Performance Summary</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Person</th>
                    <th>Group</th>
                    <th>Shift</th>
                    <th>Trucks</th>
                    <th>Impounded</th>
                    <th>Success Rate</th>
                    <th>Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {(isCollapsed ? displayedPeopleRows : analytics.basic.peopleRows)
                    .sort((a, b) => b.trucks - a.trucks)
                    .map((person, idx) => (
                      <tr key={person.person}>
                        <td>
                          <Badge bg={idx < 3 ? 'success' : idx < 5 ? 'warning' : 'secondary'}>
                            #{idx + 1}
                          </Badge>
                        </td>
                        <td><strong>{person.person}</strong></td>
                        <td>{person.group || <em className="text-muted">Unassigned</em>}</td>
                        <td>{person.shift || <em className="text-muted">No shift</em>}</td>
                        <td>{person.trucks}</td>
                        <td>
                          {person.impounded > 0 ? (
                            <Badge bg="danger">{person.impounded}</Badge>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <ProgressBar 
                              now={((person.trucks - person.impounded) / person.trucks) * 100} 
                              variant="success" 
                              style={{ width: '60px', height: '8px' }}
                              className="me-2"
                            />
                            <small>{(((person.trucks - person.impounded) / person.trucks) * 100).toFixed(1)}%</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg={person.trucks >= analytics.stats.avgTrucksPerPerson ? 'success' : 'secondary'}>
                            {person.trucks >= analytics.stats.avgTrucksPerPerson ? 'Above Avg' : 'Below Avg'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  {isCollapsed && analytics.basic.peopleRows.length > 3 && (
                    <tr className="table-info">
                      <td colSpan="8" className="text-center">
                        <em>Showing 3 of {analytics.basic.peopleRows.length} people. Click "Show All Data" to see the complete list.</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}

function computeAdvancedAnalytics(rows, peopleToGroup, peopleToShift) {
  const perPersonCounts = {};
  const perPersonImpounded = {};
  const perPersonRevenue = {};
  const perGroupCounts = {};
  const perGroupRevenue = {};
  const perShiftCounts = {};
  const perShiftRevenue = {};
  const impoundedByShift = {};
  const impoundedByGroup = {};
  const dailyActivity = {};
  const truckIds = new Set();
  let total = 0;
  let totalImpounded = 0;
  let totalRevenue = 0;

  // Helper: detect placeholder or invalid person names
  const isPlaceholderName = (v) => {
    if (v === undefined || v === null) return true;
    const s = String(v).trim();
    if (!s) return true;
    const low = s.toLowerCase();
    return ['n/a', 'na', 'none', 'unknown', '-'].includes(low) || /^n\.?a\.?$/i.test(s);
  };

  // Helper: pick the best available person name from row fields
  const resolvePersonName = (r) => {
    const candidates = [r.person, r._raw?.['User Full Name'], r._raw?.['Driver Name'], r._raw?.['Name'], r._raw?.['Driver'], r._raw?.['Owner Name']];
    for (const c of candidates) {
      if (c && !isPlaceholderName(c)) return String(c).trim();
    }
    return 'Unknown';
  };

  // Process each row for comprehensive analytics
  for (const r of rows) {
    const person = resolvePersonName(r);
    const group = peopleToGroup[person] || 'Unassigned';
    const shift = peopleToShift[person] || 'Unassigned';
    
    // Extract date from various possible date fields
    const dateStr = r.date || r._raw?.date || r._raw?.Date || r._raw?.datetime || r._raw?.Datetime;
    let dayKey = 'Unknown Date';
    if (dateStr) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
      } catch (e) {
        // If date parsing fails, use the original string
        dayKey = String(dateStr).split('T')[0] || dayKey;
      }
    }
    
    total += 1;
  // Calculate revenue for this row. Use numeric fields if present.
  const amt = Number(r.amountDue || r._raw?.['Amount Due'] || 0) || 0;
  const gvm = Number(r.gvmFine || r._raw?.['GVM Fine'] || 0) || 0;
  const d1 = Number(r.d1Fine || r._raw?.['D1 Fine'] || 0) || 0;
  const d2 = Number(r.d2Fine || r._raw?.['D2 Fine'] || 0) || 0;
  const d3 = Number(r.d3Fine || r._raw?.['D3 Fine'] || 0) || 0;
  const d4 = Number(r.d4Fine || r._raw?.['D4 Fine'] || 0) || 0;
  const awk = Number(r.awkwardLoadFine || r._raw?.['Awkward Load Fine'] || 0) || 0;
  const amtDriver = Number(r.amountDueDriver || r._raw?.['Amount Due Driver'] || 0) || 0;
  const rowRevenue = amt + gvm + d1 + d2 + d3 + d4 + awk + amtDriver;
  totalRevenue += rowRevenue;

  // accumulate revenue by person/group/shift
  perPersonRevenue[person] = (perPersonRevenue[person] || 0) + rowRevenue;
  perGroupRevenue[group] = (perGroupRevenue[group] || 0) + rowRevenue;
  perShiftRevenue[shift] = (perShiftRevenue[shift] || 0) + rowRevenue;
    perPersonCounts[person] = (perPersonCounts[person] || 0) + 1;
    perGroupCounts[group] = (perGroupCounts[group] || 0) + 1;
    perShiftCounts[shift] = (perShiftCounts[shift] || 0) + 1;
    
    // Daily activity tracking
    if (!dailyActivity[dayKey]) {
      dailyActivity[dayKey] = { total: 0, impounded: 0 };
    }
    dailyActivity[dayKey].total += 1;
    
    // Track unique truck IDs if available
    if (r.truckId && r.truckId.trim()) {
      truckIds.add(r.truckId.trim());
    }
    
    if (r.impounded) {
      totalImpounded += 1;
      perPersonImpounded[person] = (perPersonImpounded[person] || 0) + 1;
      impoundedByShift[shift] = (impoundedByShift[shift] || 0) + 1;
      impoundedByGroup[group] = (impoundedByGroup[group] || 0) + 1;
      dailyActivity[dayKey].impounded += 1;
    }
  }

  const peopleRows = Object.keys(perPersonCounts).sort().map(p => ({
    person: p,
    group: peopleToGroup[p] || 'Unassigned',
    shift: peopleToShift[p] || 'Unassigned',
    trucks: perPersonCounts[p] || 0,
    impounded: perPersonImpounded[p] || 0,
    revenue: perPersonRevenue[p] || 0,
  }));

  // Advanced statistics
  // Exclude placeholder/Unknown keys from uniquePeople count
  const uniquePeople = Object.keys(perPersonCounts).filter(p => !isPlaceholderName(p) && p !== 'Unknown').length;
  const avgTrucksPerPerson = uniquePeople > 0 ? total / uniquePeople : 0;
  const impoundedRate = total > 0 ? (totalImpounded / total) * 100 : 0;
  
  // Find top performers
  // Top performer by trucks (ignore Unknown/placeholder names)
  const topPerformer = peopleRows
    .filter(p => p.person && !isPlaceholderName(p.person) && p.person !== 'Unknown')
    .reduce((max, person) => (person.trucks > (max.trucks || 0) ? person : max), {});
  
  // Find top group
  const topGroupEntry = Object.entries(perGroupCounts).reduce((max, [group, count]) => 
    count > (max[1] || 0) ? [group, count] : max, ['', 0]);
  const topGroup = {
    name: topGroupEntry[0],
    trucks: topGroupEntry[1],
    percentage: total > 0 ? (topGroupEntry[1] / total) * 100 : 0
  };

  // Top revenue performer
  // Top revenue performer, ignoring placeholder names
  const topRevenuePerformerEntry = Object.entries(perPersonRevenue)
    .filter(([name]) => name && !isPlaceholderName(name) && name !== 'Unknown')
    .reduce((max, [name, rev]) => (rev > (max[1] || 0) ? [name, rev] : max), ['', 0]);
  const topRevenuePerformer = { name: topRevenuePerformerEntry[0] || 'Unknown', revenue: topRevenuePerformerEntry[1] || 0 };

  // Generate performance alerts
  const alerts = [];
  
  if (impoundedRate > 15) {
    alerts.push({
      type: 'danger',
      title: 'High Impound Rate Alert',
      message: `Current impound rate is ${impoundedRate.toFixed(1)}%, which is concerning. Consider reviewing processes.`
    });
  } else if (impoundedRate > 10) {
    alerts.push({
      type: 'warning',
      title: 'Elevated Impound Rate',
      message: `Impound rate is ${impoundedRate.toFixed(1)}%. Monitor closely to prevent further increases.`
    });
  }

  // Check for underperforming individuals
  const underPerformers = peopleRows.filter(p => p.trucks < avgTrucksPerPerson * 0.5);
  if (underPerformers.length > 0) {
    alerts.push({
      type: 'warning',
      title: 'Performance Gap Identified',
      message: `${underPerformers.length} team members are performing significantly below average. Consider additional training.`
    });
  }

  // Check for unassigned personnel
  const unassignedCount = peopleRows.filter(p => p.group === 'Unassigned' || p.shift === 'Unassigned').length;
  if (unassignedCount > 0) {
    alerts.push({
      type: 'info',
      title: 'Assignment Needed',
      message: `${unassignedCount} team members need group or shift assignments for better organization.`
    });
  }

  // Prepare trend data
  const sortedDates = Object.keys(dailyActivity).sort();
  const trends = sortedDates.length > 1 ? {
    dates: sortedDates.map(date => {
      // Format date for display
      if (date === 'Unknown Date') return date;
      try {
        return new Date(date).toLocaleDateString();
      } catch (e) {
        return date;
      }
    }),
    dailyCounts: sortedDates.map(date => dailyActivity[date].total),
    dailyImpounded: sortedDates.map(date => dailyActivity[date].impounded)
  } : null;

  return {
    basic: {
      totalTrucks: total,
      totalImpounded,
  totalRevenue,
      perPerson: perPersonCounts,
      perGroup: perGroupCounts,
      perShift: perShiftCounts,
      peopleRows,
  perPersonRevenue,
  perGroupRevenue,
  perShiftRevenue,
    },
    stats: {
      uniquePeople,
      avgTrucksPerPerson,
      impoundedRate,
      topPerformer,
      topGroup,
      uniqueTrucks: truckIds.size,
  topRevenuePerformer,
    },
    impoundedByShift,
    impoundedByGroup,
    alerts,
    trends,
    dailyActivity,
  };
}


