const { getClient, migrate, totalExpr } = require('../_lib/db');

module.exports = async function handler(req, res) {
  try {
    await migrate();
    const db = getClient();
    const sql = `
      SELECT CASE
               WHEN CAST(strftime('%H', w_datetime) AS INTEGER) BETWEEN 6 AND 13 THEN 'Morning'
               WHEN CAST(strftime('%H', w_datetime) AS INTEGER) BETWEEN 14 AND 21 THEN 'Afternoon'
               ELSE 'Night'
             END AS key,
             COUNT(*) AS count,
             COALESCE(SUM(${totalExpr()}),0) AS total
      FROM weighbridge_records
      GROUP BY key
      ORDER BY total DESC
    `;
    const r = await db.execute(sql);
    res.status(200).json(r.rows || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};