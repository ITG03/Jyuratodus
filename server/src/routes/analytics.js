import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

function totalExpr() {
  return `COALESCE(total_revenue,
    COALESCE(amount_due,0)+COALESCE(gvm_fine,0)+COALESCE(d1_fine,0)+
    COALESCE(d2_fine,0)+COALESCE(d3_fine,0)+COALESCE(d4_fine,0)+
    COALESCE(awkward_load_fine,0)+COALESCE(amount_due_driver,0)
  )`;
}

router.get('/overview', (req, res) => {
  const row = db.prepare(`
    SELECT COUNT(*) AS rows,
           SUM(${totalExpr()}) AS overall_total
    FROM weighbridge_records
  `).get();
  res.json(row);
});

router.get('/by-person', (req, res) => {
  const stmt = db.prepare(`
    SELECT p.name AS key, COUNT(r.id) AS count,
           COALESCE(SUM(${totalExpr()}),0) AS total
    FROM weighbridge_records r
    LEFT JOIN people p ON p.id = r.person_id
    GROUP BY p.name
    ORDER BY total DESC
    LIMIT COALESCE(@limit, 50)
  `);
  const rows = stmt.all({ limit: Number(req.query.limit) || 50 });
  res.json(rows);
});

router.get('/by-site', (req, res) => {
  const stmt = db.prepare(`
    SELECT s.name AS key, COUNT(r.id) AS count,
           COALESCE(SUM(${totalExpr()}),0) AS total
    FROM weighbridge_records r
    LEFT JOIN sites s ON s.id = r.site_id
    GROUP BY s.name
    ORDER BY total DESC
    LIMIT COALESCE(@limit, 50)
  `);
  const rows = stmt.all({ limit: Number(req.query.limit) || 50 });
  res.json(rows);
});

router.get('/by-shift', (req, res) => {
  const stmt = db.prepare(`
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
  `);
  const rows = stmt.all();
  res.json(rows);
});

router.get('/by-group', (req, res) => {
  const stmt = db.prepare(`
    SELECT g.name AS key, COUNT(r.id) AS count,
           COALESCE(SUM(${totalExpr()}),0) AS total
    FROM weighbridge_records r
    LEFT JOIN people p ON p.id = r.person_id
    LEFT JOIN groups g ON g.id = p.group_id
    GROUP BY g.name
    ORDER BY total DESC
    LIMIT COALESCE(@limit, 50)
  `);
  const rows = stmt.all({ limit: Number(req.query.limit) || 50 });
  res.json(rows);
});

export default router;