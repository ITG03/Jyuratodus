const { getClient, migrate } = require('../_lib/db');

async function readBody(req) {
  if (req.body) return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(buf); } catch { return {}; }
}

module.exports = async function handler(req, res) {
  try {
    await migrate();
    const db = getClient();

    if (req.method === 'GET') {
      const r = await db.execute('SELECT * FROM groups ORDER BY id DESC');
      return res.status(200).json(r.rows || []);
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const name = (body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name required' });
      const ins = await db.execute({ sql: 'INSERT INTO groups (name) VALUES (?)', args: [name] });
      return res.status(201).json({ id: Number(ins.lastInsertRowid || ins.insertId || null) });
    }

    if (req.method === 'DELETE') {
      const id = Number(req.query.id);
      await db.execute({ sql: 'UPDATE people SET group_id = NULL WHERE group_id = ?', args: [id] });
      await db.execute({ sql: 'DELETE FROM groups WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};