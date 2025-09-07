import { query } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const rows = await query(`SELECT p.id, p.name, g.name AS "group", s.name AS shift, p.created_at AS createdAt, p.updated_at AS updatedAt FROM people p LEFT JOIN groups g ON g.id = p.group_id LEFT JOIN shifts s ON s.id = p.shift_id ORDER BY p.id DESC`);
      return res.json(rows.rows);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  if (req.method === 'POST') {
    const { name, group, shift } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
    const client = (await import('../_lib/db.js')).default; // not used

    try {
      // Ensure group and shift exist if provided
      let group_id = null, shift_id = null;
      if (group) {
        const g = await query('INSERT INTO groups (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id', [String(group).trim()]);
        group_id = g.rows[0].id;
      }
      if (shift) {
        const s = await query('INSERT INTO shifts (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id', [String(shift).trim()]);
        shift_id = s.rows[0].id;
      }

      const existing = await query('SELECT id FROM people WHERE name = $1', [String(name).trim()]);
      if (existing.rows.length) {
        await query('UPDATE people SET group_id = COALESCE($1, group_id), shift_id = COALESCE($2, shift_id), updated_at = now() WHERE id = $3', [group_id, shift_id, existing.rows[0].id]);
        return res.json({ id: existing.rows[0].id, updated: true });
      }

      const ins = await query('INSERT INTO people (name, group_id, shift_id) VALUES ($1,$2,$3) RETURNING id', [String(name).trim(), group_id, shift_id]);
      res.status(201).json({ id: ins.rows[0].id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e) });
    }
    return;
  }

  return res.status(405).json({ error: 'method not allowed' });
}
