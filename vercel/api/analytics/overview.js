import { query } from '../_lib/db.js';

export default async function handler(req, res) {
  try {
    const totalExpr = `COALESCE(total_revenue,
      COALESCE(amount_due,0)+COALESCE(gvm_fine,0)+COALESCE(d1_fine,0)+
      COALESCE(d2_fine,0)+COALESCE(d3_fine,0)+COALESCE(d4_fine,0)+
      COALESCE(awkward_load_fine,0)+COALESCE(amount_due_driver,0)
    )`;

    const sql = `SELECT COUNT(*)::int AS rows, SUM(${totalExpr})::float AS overall_total FROM weighbridge_records`;
    const r = await query(sql);
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
}
