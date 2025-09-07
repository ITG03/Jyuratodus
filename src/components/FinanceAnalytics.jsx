import React, { useMemo } from 'react';
import { Card, Row, Col, Alert } from 'react-bootstrap';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { FaMoneyBillWave } from 'react-icons/fa';
import { useApp } from '../context';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const formatCurrency = (amount) => new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW', minimumFractionDigits: 2 }).format(amount || 0);

function toNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  // handle strings like "1,234.56"
  const n = Number(String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function rowRevenue(row) {
  // Prefer explicit total from Excel if present
  const explicit = toNumber(row.totalRevenue ?? row.TotalRevenue ?? row['Total Revenue']);
  if (explicit) return explicit;
  // Otherwise sum known components directly from Excel fields
  return (
    toNumber(row.amountDue ?? row['Amount Due']) +
    toNumber(row.gvmFine ?? row['GVM Fine']) +
    toNumber(row.d1Fine ?? row['D1 Fine']) +
    toNumber(row.d2Fine ?? row['D2 Fine']) +
    toNumber(row.d3Fine ?? row['D3 Fine']) +
    toNumber(row.d4Fine ?? row['D4 Fine']) +
    toNumber(row.awkwardLoadFine ?? row['Awkward Load Fine']) +
    toNumber(row.amountDueDriver ?? row['Amount Due Driver'])
  );
}

export default function FinanceAnalytics() {
  const { rows, peopleToGroup, peopleToShift } = useApp();

  const data = useMemo(() => {
    if (!rows || rows.length === 0) return null;

    const byPerson = new Map();
    const byGroup = new Map();
    const byShift = new Map();

    for (const r of rows) {
      const revenue = rowRevenue(r);
      const person = (r.person || r['User Full Name'] || r._raw?.['User Full Name'] || 'Unknown').toString().trim() || 'Unknown';

      // Per person
      byPerson.set(person, (byPerson.get(person) || 0) + revenue);

      // Per group from current assignments map (Excel typically lacks group info)
      const group = (peopleToGroup[person] || 'No Group');
      byGroup.set(group, (byGroup.get(group) || 0) + revenue);

      // Per shift from assignments map
      const shift = (peopleToShift[person] || 'No Shift');
      byShift.set(shift, (byShift.get(shift) || 0) + revenue);
    }

    const sortDesc = (a, b) => b.revenue - a.revenue;

    const arrPerson = Array.from(byPerson, ([name, revenue]) => ({ name, revenue })).sort(sortDesc);
    const arrGroup = Array.from(byGroup, ([name, revenue]) => ({ name, revenue })).sort(sortDesc);
    const arrShift = Array.from(byShift, ([name, revenue]) => ({ name, revenue })).sort(sortDesc);

    return { arrPerson, arrGroup, arrShift };
  }, [rows, peopleToGroup, peopleToShift]);

  if (!rows || rows.length === 0) {
    return <Alert variant="info">Upload Excel data to view finance totals directly from the file.</Alert>;
  }

  const barOpts = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.parsed.y) } } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) } } },
  };
  const pieOpts = { responsive: true, plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } } } };

  return (
    <div>
      <h3 className="mb-3"><FaMoneyBillWave className="me-2" />Finance (from Excel)</h3>

      <Row className="g-4">
        <Col lg={12}>
          <Card className="modern-card">
            <Card.Header>
              <Card.Title className="mb-0">Revenue by Person (Top 20)</Card.Title>
            </Card.Header>
            <Card.Body>
              <Bar
                options={barOpts}
                data={{
                  labels: data.arrPerson.slice(0, 20).map(r => r.name),
                  datasets: [{ label: 'ZMW', data: data.arrPerson.slice(0, 20).map(r => r.revenue), backgroundColor: 'rgba(54, 162, 235, 0.8)' }]
                }}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="modern-card">
            <Card.Header>
              <Card.Title className="mb-0">Revenue by Group</Card.Title>
            </Card.Header>
            <Card.Body>
              <Pie 
                data={{
                  labels: data.arrGroup.map(r => r.name),
                  datasets: [{ data: data.arrGroup.map(r => r.revenue), backgroundColor: ['#ef4444','#10b981','#3b82f6','#f59e0b','#8b5cf6','#06b6d4','#84cc16','#f97316'] }]
                }}
                options={pieOpts}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="modern-card">
            <Card.Header>
              <Card.Title className="mb-0">Revenue by Shift</Card.Title>
            </Card.Header>
            <Card.Body>
              <Pie 
                data={{
                  labels: data.arrShift.map(r => r.name),
                  datasets: [{ data: data.arrShift.map(r => r.revenue), backgroundColor: ['#f59e0b','#10b981','#8b5cf6','#ef4444','#06b6d4'] }]
                }}
                options={pieOpts}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}