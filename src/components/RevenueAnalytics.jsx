import React, { useState } from 'react';
import { Card, Row, Col, Alert, Badge } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num);
};

export default function RevenueAnalytics({ excelData, people, groups, shifts }) {
  const [chartMode, setChartMode] = useState('top'); // 'top' | 'bottom' | 'scatter'
  // Calculate total revenue statistics
  const calculateRevenueStats = () => {
    if (!excelData || excelData.length === 0) {
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        averageRevenue: 0,
        totalFines: 0,
        revenueByPerson: [],
        revenueByGroup: [],
        revenueByShift: [],
        revenueBreakdown: [],
        monthlyRevenue: []
      };
    }

    let totalRevenue = 0;
    let totalFines = 0;
    const revenueByPerson = new Map();
    const revenueByGroup = new Map();
    const revenueByShift = new Map();
    const monthlyRevenue = new Map();
    
    // Fine types breakdown
    const fineTypes = {
      'Amount Due': 0,
      'GVM Fine': 0,
      'D1 Fine': 0,
      'D2 Fine': 0,
      'D3 Fine': 0,
      'D4 Fine': 0,
      'Awkward Load Fine': 0,
      'Amount Due Driver': 0
    };

    excelData.forEach(row => {
      const revenue = row.totalRevenue || 0;
      totalRevenue += revenue;
      
      // Add up individual fine types
      fineTypes['Amount Due'] += row.amountDue || 0;
      fineTypes['GVM Fine'] += row.gvmFine || 0;
      fineTypes['D1 Fine'] += row.d1Fine || 0;
      fineTypes['D2 Fine'] += row.d2Fine || 0;
      fineTypes['D3 Fine'] += row.d3Fine || 0;
      fineTypes['D4 Fine'] += row.d4Fine || 0;
      fineTypes['Awkward Load Fine'] += row.awkwardLoadFine || 0;
      fineTypes['Amount Due Driver'] += row.amountDueDriver || 0;
      
      totalFines += (row.gvmFine || 0) + (row.d1Fine || 0) + (row.d2Fine || 0) + 
                   (row.d3Fine || 0) + (row.d4Fine || 0) + (row.awkwardLoadFine || 0);

      // Revenue by person
      const person = row.person || 'Unknown';
      revenueByPerson.set(person, (revenueByPerson.get(person) || 0) + revenue);

      // Find person's group and shift
      const personRecord = people.find(p => p.name === person);
      if (personRecord) {
        const group = personRecord.group || 'No Group';
        const shift = personRecord.shift || 'No Shift';
        
        revenueByGroup.set(group, (revenueByGroup.get(group) || 0) + revenue);
        revenueByShift.set(shift, (revenueByShift.get(shift) || 0) + revenue);
      } else {
        revenueByGroup.set('No Group', (revenueByGroup.get('No Group') || 0) + revenue);
        revenueByShift.set('No Shift', (revenueByShift.get('No Shift') || 0) + revenue);
      }

      // Monthly revenue (if date available)
      if (row.date) {
        try {
          const date = new Date(row.date);
          const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + revenue);
        } catch (e) {
          // Invalid date, skip monthly aggregation
        }
      }
    });

    return {
      totalRevenue,
      totalTransactions: excelData.length,
      averageRevenue: totalRevenue / excelData.length,
      totalFines,
      revenueByPerson: Array.from(revenueByPerson.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue),
      revenueByGroup: Array.from(revenueByGroup.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue),
      revenueByShift: Array.from(revenueByShift.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue),
      revenueBreakdown: Object.entries(fineTypes).map(([type, amount]) => ({ type, amount })).filter(item => item.amount > 0),
      monthlyRevenue: Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({ month, revenue })).sort((a, b) => new Date(a.month + ' 1') - new Date(b.month + ' 1'))
    };
  };

  const stats = calculateRevenueStats();

  // Prepare bottom-earners and scatter (revenue vs weight) datasets
  const bottomRevenue = stats.revenueByPerson.slice().reverse().slice(0, 10).map(item => ({ name: item.name, revenue: item.revenue }));

  // Scatter: try to build pairs of (weight, revenue) from rows. Be robust to different field names
  const scatterPoints = [];
  excelData.forEach(row => {
    const revenue = row.totalRevenue || 0;
    // try common weight fields
    let weight = row.gvmWeight || row.GVMWeight || row['GVM Weight'] || row._raw && (row._raw['GVM Weight'] || row._raw['GVM Weight ']) || row._raw && row._raw.gvm_weight;
    if (weight === undefined) weight = row.gvm || row.weight || 0;
    // normalize
    if (typeof weight === 'string') {
      weight = Number(weight.replace(/[,\s]/g, ''));
    }
    if (!Number.isFinite(weight)) weight = 0;
    // Only push meaningful points
    if (revenue !== 0 || weight !== 0) scatterPoints.push({ x: weight, y: revenue, label: row.person || row._raw && (row._raw['User Full Name'] || row._raw['User'] ) || 'Unknown' });
  });

  const scatterData = {
    datasets: [
      {
        label: 'Revenue vs Vehicle GVM Weight',
        data: scatterPoints,
        backgroundColor: 'rgba(75,192,192,0.8)'
      }
    ]
  };

  // Chart configurations
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${formatCurrency(context.parsed.y || context.parsed)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
          }
        }
      }
    }
  };

  const revenueByPersonChart = {
    labels: stats.revenueByPerson.slice(0, 10).map(item => item.name),
    datasets: [
      {
        label: 'Revenue Generated',
        data: stats.revenueByPerson.slice(0, 10).map(item => item.revenue),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const revenueBottomChart = {
    labels: bottomRevenue.map(item => item.name),
    datasets: [
      {
        label: 'Lowest Revenue (bottom 10)',
        data: bottomRevenue.map(item => item.revenue),
        backgroundColor: 'rgba(255,99,132,0.8)'
      }
    ]
  };

  const revenueByGroupChart = {
    labels: stats.revenueByGroup.map(item => item.name),
    datasets: [
      {
        label: 'Revenue by Group',
        data: stats.revenueByGroup.map(item => item.revenue),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
      },
    ],
  };

  const revenueByShiftChart = {
    labels: stats.revenueByShift.map(item => item.name),
    datasets: [
      {
        label: 'Revenue by Shift',
        data: stats.revenueByShift.map(item => item.revenue),
        backgroundColor: [
          'rgba(255, 159, 64, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
      },
    ],
  };

  const revenueBreakdownChart = {
    labels: stats.revenueBreakdown.map(item => item.type),
    datasets: [
      {
        label: 'Revenue Breakdown',
        data: stats.revenueBreakdown.map(item => item.amount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)',
        ],
      },
    ],
  };

  const monthlyRevenueChart = {
    labels: stats.monthlyRevenue.map(item => item.month),
    datasets: [
      {
        label: 'Monthly Revenue',
        data: stats.monthlyRevenue.map(item => item.revenue),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  if (!excelData || excelData.length === 0) {
    return (
      <Alert variant="info" className="text-center">
        <Alert.Heading>📊 Revenue Analytics</Alert.Heading>
        <p>Upload Excel data to view revenue analytics and statistics.</p>
      </Alert>
    );
  }

  return (
    <div className="revenue-analytics">
      <h2 className="mb-4">💰 Revenue Analytics Dashboard</h2>
      
      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center bg-success text-white">
            <Card.Body>
              <Card.Title>Total Revenue</Card.Title>
              <Card.Text className="h3">{formatCurrency(stats.totalRevenue)}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center bg-info text-white">
            <Card.Body>
              <Card.Title>Total Transactions</Card.Title>
              <Card.Text className="h3">{formatNumber(stats.totalTransactions)}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center bg-warning text-white">
            <Card.Body>
              <Card.Title>Average Revenue</Card.Title>
              <Card.Text className="h3">{formatCurrency(stats.averageRevenue)}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center bg-danger text-white">
            <Card.Body>
              <Card.Title>Total Fines</Card.Title>
              <Card.Text className="h3">{formatCurrency(stats.totalFines)}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 1 */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <Card.Title className="mb-0">📈 Revenue by Person</Card.Title>
                <div>
                  <Badge onClick={() => setChartMode('top')} bg={chartMode === 'top' ? 'primary' : 'light'} style={{ cursor: 'pointer', marginRight: 6 }}>Top</Badge>
                  <Badge onClick={() => setChartMode('bottom')} bg={chartMode === 'bottom' ? 'primary' : 'light'} style={{ cursor: 'pointer', marginRight: 6 }}>Bottom</Badge>
                  <Badge onClick={() => setChartMode('scatter')} bg={chartMode === 'scatter' ? 'primary' : 'light'} style={{ cursor: 'pointer' }}>Scatter</Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {stats.revenueByPerson.length > 0 ? (
                chartMode === 'top' ? (
                  <Bar data={revenueByPersonChart} options={chartOptions} />
                ) : chartMode === 'bottom' ? (
                  <Bar data={revenueBottomChart} options={chartOptions} />
                ) : (
                  <div>
                    <p className="text-muted">Scatter: revenue (ZMW) vs vehicle GVM weight (kg). Hover points for person.</p>
                    <Scatter data={scatterData} options={{
                      responsive: true,
                      plugins: { tooltip: { callbacks: { label: ctx => `${ctx.raw.label || ''}: ${formatCurrency(ctx.raw.y)} (weight: ${ctx.raw.x})` } } },
                      scales: {
                        x: { title: { display: true, text: 'GVM Weight' } },
                        y: { title: { display: true, text: 'Revenue (ZMW)' }, beginAtZero: true }
                      }
                    }} />
                  </div>
                )
              ) : (
                <p className="text-muted text-center">No person data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">👥 Revenue by Group</Card.Title>
            </Card.Header>
            <Card.Body>
              {stats.revenueByGroup.length > 0 ? (
                <Pie data={revenueByGroupChart} options={pieOptions} />
              ) : (
                <p className="text-muted text-center">No group data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row className="mb-4">
        <Col lg={4}>
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">🕒 Revenue by Shift</Card.Title>
            </Card.Header>
            <Card.Body>
              {stats.revenueByShift.length > 0 ? (
                <Pie data={revenueByShiftChart} options={pieOptions} />
              ) : (
                <p className="text-muted text-center">No shift data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">💸 Revenue Breakdown by Type</Card.Title>
            </Card.Header>
            <Card.Body>
              {stats.revenueBreakdown.length > 0 ? (
                <Bar 
                  data={revenueBreakdownChart} 
                  options={{
                    ...chartOptions,
                    indexAxis: 'y',
                    scales: {
                      x: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return formatCurrency(value);
                          }
                        }
                      }
                    }
                  }} 
                />
              ) : (
                <p className="text-muted text-center">No revenue breakdown available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Monthly Trend */}
      {stats.monthlyRevenue.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <Card.Title className="mb-0">📅 Monthly Revenue Trend</Card.Title>
              </Card.Header>
              <Card.Body>
                <Line data={monthlyRevenueChart} options={chartOptions} />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Revenue Rankings */}
      <Row className="mb-4">
        <Col lg={4}>
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">🏆 Top Performers (People)</Card.Title>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {stats.revenueByPerson.slice(0, 10).map((person, index) => (
                <div key={person.name} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                  <div>
                    <Badge bg={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'warning' : 'secondary'}>
                      #{index + 1}
                    </Badge>
                    <span className="ms-2">{person.name}</span>
                  </div>
                  <strong>{formatCurrency(person.revenue)}</strong>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">👥 Group Performance</Card.Title>
            </Card.Header>
            <Card.Body>
              {stats.revenueByGroup.map((group, index) => (
                <div key={group.name} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                  <div>
                    <Badge bg="primary">#{index + 1}</Badge>
                    <span className="ms-2">{group.name}</span>
                  </div>
                  <strong>{formatCurrency(group.revenue)}</strong>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">🕒 Shift Performance</Card.Title>
            </Card.Header>
            <Card.Body>
              {stats.revenueByShift.map((shift, index) => (
                <div key={shift.name} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                  <div>
                    <Badge bg="info">#{index + 1}</Badge>
                    <span className="ms-2">{shift.name}</span>
                  </div>
                  <strong>{formatCurrency(shift.revenue)}</strong>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}