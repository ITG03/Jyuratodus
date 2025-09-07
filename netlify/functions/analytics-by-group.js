const { getClient, migrate, totalExpr } = require('./util/db');

exports.handler = async (event) => {
  try {
    await migrate();
    const db = getClient();
    const url = new URL(event.rawUrl);
    const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get('limit') || '50')));
    const sql = `
      SELECT g.name AS key, COUNT(r.id) AS count,
             COALESCE(SUM(${totalExpr()}),0) AS total
      FROM weighbridge_records r
      LEFT JOIN people p ON p.id = r.person_id
      LEFT JOIN groups g ON g.id = p.group_id
      GROUP BY g.name
      ORDER BY total DESC
      LIMIT ?`;
    const r = await db.execute({ sql, args: [limit] });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.rows || []) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};