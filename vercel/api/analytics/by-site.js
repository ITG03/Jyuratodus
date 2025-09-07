const { getClient, migrate, totalExpr } = require('../_lib/db');

module.exports = async function handler(req, res) {
  try {
    await migrate();
    const db = getClient();
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 50));
    const sql = `
      SELECT s.name AS key, COUNT(r.id) AS count,
             COALESCE(SUM(${totalExpr()}),0) AS total
      FROM weighbridge_records r
      LEFT JOIN sites s ON s.id = r.site_id
      GROUP BY s.name
      ORDER BY total DESC
      LIMIT ?
    `;
    const r = await db.execute({ sql, args: [limit] });
    res.status(200).json(r.rows || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};