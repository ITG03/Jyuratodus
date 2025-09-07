// Netlify Function for /api/refs/groups
const { getClient, migrate } = require('./util/db');

async function readBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}

exports.handler = async (event) => {
  try {
    await migrate();
    const db = getClient();

    if (event.httpMethod === 'GET') {
      const r = await db.execute('SELECT * FROM groups ORDER BY id DESC');
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.rows || []) };
    }

    if (event.httpMethod === 'POST') {
      const body = await readBody(event);
      const name = (body?.name || '').trim();
      if (!name) return { statusCode: 400, body: JSON.stringify({ error: 'name required' }) };
      const ins = await db.execute({ sql: 'INSERT INTO groups (name) VALUES (?)', args: [name] });
      return { statusCode: 201, body: JSON.stringify({ id: Number(ins.lastInsertRowid || ins.insertId || null) }) };
    }

    if (event.httpMethod === 'DELETE') {
      const url = new URL(event.rawUrl);
      const id = Number(url.searchParams.get('id'));
      await db.execute({ sql: 'UPDATE people SET group_id = NULL WHERE group_id = ?', args: [id] });
      await db.execute({ sql: 'DELETE FROM groups WHERE id = ?', args: [id] });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};