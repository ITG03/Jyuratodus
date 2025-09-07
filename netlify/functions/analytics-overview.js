const { getClient, migrate, totalExpr } = require('./util/db');

exports.handler = async (event) => {
  try {
    await migrate();
    const db = getClient();
    const r = await db.execute({
      sql: `SELECT COUNT(id) AS count, COALESCE(SUM(${totalExpr()}),0) AS total FROM weighbridge_records`
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.rows?.[0] || { count: 0, total: 0 }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};