const { getClient, migrate } = require('./util/db');

async function readBody(event) { try { return JSON.parse(event.body || '{}'); } catch { return {}; } }

exports.handler = async (event) => {
  try {
    await migrate();
    const db = getClient();

    if (event.httpMethod === 'GET') {
      const r = await db.execute('SELECT p.id, p.name, g.name as `group`, s.name as shift FROM people p\n        LEFT JOIN groups g ON g.id=p.group_id LEFT JOIN shifts s ON s.id=p.shift_id ORDER BY p.id DESC');
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.rows || []) };
    }

    if (event.httpMethod === 'POST') {
      const body = await readBody(event);
      const name = (body?.name || '').trim();
      const group = (body?.group || '').trim() || null;
      const shift = (body?.shift || '').trim() || null;
      if (!name) return { statusCode: 400, body: JSON.stringify({ error: 'name required' }) };
      const ins = await db.execute({ sql: 'INSERT INTO people (name, group_id, shift_id) VALUES (?,?,?)', args: [name, group, shift] });
      return { statusCode: 201, body: JSON.stringify({ id: Number(ins.lastInsertRowid || ins.insertId || null) }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};