import { query } from '../_lib/db.js';

export default async function handler(req, res) {
  try {
    const limit = Number(req.query.limit) || 50;
    const totalExpr = `COALESCE(total_revenue,
      COALESCE(amount_due,0)+COALESCE(gvm_fine,0)+COALESCE(d1_fine,0)+
      COALESCE(d2_fine,0)+COALESCE(d3_fine,0)+COALESCE(d4_fine,0)+
      COALESCE(awkward_load_fine,0)+COALESCE(amount_due_driver,0)
    )`;

    const sql = `SELECT p.name AS key, COUNT(r.id)::int AS count, COALESCE(SUM(${totalExpr}),0)::float AS total
      FROM weighbridge_records r
      LEFT JOIN people p ON p.id = r.person_id
      GROUP BY p.name
      ORDER BY total DESC
      LIMIT $1`;
    const r = await query(sql, [limit]);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
}
