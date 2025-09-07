const { getClient, migrate } = require('../../_lib/db');

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
    const id = Number(req.query.id);

    if (req.method === 'PATCH') {
      const body = await readBody(req);
      let group_id = undefined, shift_id = undefined;
      if (body.group !== undefined) {
        if (body.group === '' || body.group === null) group_id = null; else {
          const g = await db.execute({ sql: 'SELECT id FROM groups WHERE name = ?', args: [String(body.group).trim()] });
          group_id = g.rows.length ? g.rows[0].id : null;
        }
      }
      if (body.shift !== undefined) {
        if (body.shift === '' || body.shift === null) shift_id = null; else {
          const s = await db.execute({ sql: 'SELECT id FROM shifts WHERE name = ?', args: [String(body.shift).trim()] });
          shift_id = s.rows.length ? s.rows[0].id : null;
        }
      }
      await db.execute({
        sql: `UPDATE people SET group_id = COALESCE(?, group_id), shift_id = COALESCE(?, shift_id),
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
        args: [group_id, shift_id, id]
      });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM people WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};