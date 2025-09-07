const { getClient, migrate, totalExpr } = require('./util/db');

exports.handler = async () => {
  try {
    await migrate();
    const db = getClient();
    const sql = `
      SELECT r.site AS key, COUNT(r.id) AS count,
             COALESCE(SUM(${totalExpr()}),0) AS total
      FROM weighbridge_records r
      GROUP BY r.site
      ORDER BY total DESC`;
    const r = await db.execute({ sql });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.rows || []) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};