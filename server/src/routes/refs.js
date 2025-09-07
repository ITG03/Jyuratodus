import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Enriched people list with group/shift names
router.get('/people', (req, res) => {
  const rows = db.prepare(`
    SELECT p.id, p.name,
           g.name AS "group",
           s.name AS shift,
           p.created_at AS createdAt,
           p.updated_at AS updatedAt
    FROM people p
    LEFT JOIN groups g ON g.id = p.group_id
    LEFT JOIN shifts s ON s.id = p.shift_id
    ORDER BY p.id DESC
  `).all();
  res.json(rows);
});

// Create person if not exists (by name), optionally set group/shift by name
router.post('/people', (req, res) => {
  const { name, group, shift } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });

  const sel = db.prepare('SELECT id FROM people WHERE name = ?');
  const row = sel.get(String(name).trim());
  let group_id = null, shift_id = null;
  if (group) {
    const g = db.prepare('SELECT id FROM groups WHERE name = ?').get(String(group).trim());
    if (g) group_id = g.id;
  }
  if (shift) {
    const s = db.prepare('SELECT id FROM shifts WHERE name = ?').get(String(shift).trim());
    if (s) shift_id = s.id;
  }

  if (row) {
    const upd = db.prepare('UPDATE people SET group_id = COALESCE(?, group_id), shift_id = COALESCE(?, shift_id), updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?');
    upd.run(group_id, shift_id, row.id);
    return res.json({ id: row.id, updated: true });
  }
  const ins = db.prepare('INSERT INTO people (name, group_id, shift_id) VALUES (?,?,?)');
  const id = ins.run(String(name).trim(), group_id, shift_id).lastInsertRowid;
  res.status(201).json({ id });
});

// Update person (group/shift by name)
router.patch('/people/:id', (req, res) => {
  const id = Number(req.params.id);
  const { group, shift } = req.body || {};
  let group_id = undefined, shift_id = undefined;
  if (group !== undefined) {
    if (group === '' || group === null) group_id = null; else {
      const g = db.prepare('SELECT id FROM groups WHERE name = ?').get(String(group).trim());
      group_id = g ? g.id : null;
    }
  }
  if (shift !== undefined) {
    if (shift === '' || shift === null) shift_id = null; else {
      const s = db.prepare('SELECT id FROM shifts WHERE name = ?').get(String(shift).trim());
      shift_id = s ? s.id : null;
    }
  }
  const stmt = db.prepare('UPDATE people SET group_id = COALESCE(?, group_id), shift_id = COALESCE(?, shift_id), updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?');
  stmt.run(group_id, shift_id, id);
  res.json({ ok: true });
});

// Delete person
router.delete('/people/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM people WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Groups
router.get('/groups', (req, res) => {
  const rows = db.prepare('SELECT * FROM groups ORDER BY id DESC').all();
  res.json(rows);
});
router.post('/groups', (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
  const ins = db.prepare('INSERT INTO groups (name) VALUES (?)');
  const id = ins.run(String(name).trim()).lastInsertRowid;
  res.status(201).json({ id });
});
router.delete('/groups/:id', (req, res) => {
  const id = Number(req.params.id);
  // Unassign people from this group
  db.prepare('UPDATE people SET group_id = NULL WHERE group_id = ?').run(id);
  db.prepare('DELETE FROM groups WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Shifts
router.get('/shifts', (req, res) => {
  const rows = db.prepare('SELECT * FROM shifts ORDER BY id DESC').all();
  res.json(rows);
});
router.post('/shifts', (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
  const ins = db.prepare('INSERT INTO shifts (name) VALUES (?)');
  const id = ins.run(String(name).trim()).lastInsertRowid;
  res.status(201).json({ id });
});
router.delete('/shifts/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE people SET shift_id = NULL WHERE shift_id = ?').run(id);
  db.prepare('DELETE FROM shifts WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Sites and users (read-only for now)
router.get('/sites', (req, res) => {
  const rows = db.prepare('SELECT * FROM sites ORDER BY id DESC').all();
  res.json(rows);
});
router.get('/users', (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY id DESC').all();
  res.json(rows);
});

export default router;