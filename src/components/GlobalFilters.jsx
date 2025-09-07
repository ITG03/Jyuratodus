import React, { useMemo } from 'react';
import { Form } from 'react-bootstrap';
import { useApp } from '../context';

export default function GlobalFilters() {
  const { filters, setFilters, rows, peopleToGroup, peopleToShift } = useApp();

  const sites = useMemo(() => {
    const s = new Set();
    rows.forEach(r => { if (r.site || r.siteName) s.add(String(r.site || r.siteName)); });
    return ['', ...Array.from(s).sort()];
  }, [rows]);

  const groups = useMemo(() => ['', ...Array.from(new Set(Object.values(peopleToGroup).filter(Boolean))).sort()], [peopleToGroup]);
  const shifts = useMemo(() => ['', ...Array.from(new Set(Object.values(peopleToShift).filter(Boolean))).sort()], [peopleToShift]);

  const onChange = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  return (
    <div className="d-flex flex-wrap gap-2 align-items-center">
      <Form.Control type="date" value={filters.start || ''} onChange={onChange('start')} style={{ maxWidth: 160 }} />
      <span className="text-muted">to</span>
      <Form.Control type="date" value={filters.end || ''} onChange={onChange('end')} style={{ maxWidth: 160 }} />

      <Form.Select value={filters.site || ''} onChange={onChange('site')} style={{ maxWidth: 200 }}>
        {sites.map((s, i) => <option key={i} value={s}>{s || 'All Sites'}</option>)}
      </Form.Select>

      <Form.Select value={filters.group || ''} onChange={onChange('group')} style={{ maxWidth: 200 }}>
        {groups.map((g, i) => <option key={i} value={g}>{g || 'All Groups'}</option>)}
      </Form.Select>

      <Form.Select value={filters.shift || ''} onChange={onChange('shift')} style={{ maxWidth: 200 }}>
        {shifts.map((s, i) => <option key={i} value={s}>{s || 'All Shifts'}</option>)}
      </Form.Select>

      <Form.Control placeholder="Person" value={filters.person || ''} onChange={onChange('person')} style={{ maxWidth: 220 }} />
    </div>
  );
}