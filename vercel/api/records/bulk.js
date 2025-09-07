import pool from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const body = req.body;
  if (!body || !Array.isArray(body.rows)) return res.status(400).json({ error: 'invalid payload' });

  const items = body.rows;
  const source_filename = body.source_filename || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const totals = items.reduce((acc, r) => {
      const t = (r.total_revenue ?? 0) + (r.amount_due ?? 0) + (r.gvm_fine ?? 0) + (r.d1_fine ?? 0) + (r.d2_fine ?? 0) + (r.d3_fine ?? 0) + (r.d4_fine ?? 0) + (r.awkward_load_fine ?? 0) + (r.amount_due_driver ?? 0);
      const fines = (r.gvm_fine ?? 0) + (r.d1_fine ?? 0) + (r.d2_fine ?? 0) + (r.d3_fine ?? 0) + (r.d4_fine ?? 0) + (r.awkward_load_fine ?? 0);
      acc.total += t; acc.fines += fines; return acc;
    }, { total: 0, fines: 0 });

    const insUpload = await client.query(
      `INSERT INTO excel_uploads (row_count, total_revenue, total_fines, source_filename) VALUES ($1,$2,$3,$4) RETURNING id`,
      [items.length, totals.total, totals.fines, source_filename]
    );
    const uploadId = insUpload.rows[0].id;

    for (const r of items) {
      // upsert refs (sites, users, people)
      let site_id = null, user_id = null, person_id = null;
      if (r.site) {
        const s = await client.query('INSERT INTO sites (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id', [r.site.trim()]);
        site_id = s.rows[0].id;
      }
      if (r.user_full_name) {
        const u = await client.query('INSERT INTO users (full_name) VALUES ($1) ON CONFLICT (full_name) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id', [r.user_full_name.trim()]);
        user_id = u.rows[0].id;
      }
      if (r.person_name) {
        const p = await client.query('INSERT INTO people (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id', [r.person_name.trim()]);
        person_id = p.rows[0].id;
      }

      await client.query(`INSERT INTO weighbridge_records (
        upload_id, w_datetime, site_id, user_id, person_id,
        amount_due, gvm_fine, d1_fine, d2_fine, d3_fine, d4_fine,
        awkward_load_fine, amount_due_driver, total_revenue
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `, [
        uploadId,
        r.w_datetime,
        site_id,
        user_id,
        person_id,
        r.amount_due ?? null,
        r.gvm_fine ?? null,
        r.d1_fine ?? null,
        r.d2_fine ?? null,
        r.d3_fine ?? null,
        r.d4_fine ?? null,
        r.awkward_load_fine ?? null,
        r.amount_due_driver ?? null,
        r.total_revenue ?? null
      ]);
    }

    await client.query('COMMIT');
    res.json({ uploadId, inserted: items.length });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: String(e) });
  } finally {
    client.release();
  }
}
