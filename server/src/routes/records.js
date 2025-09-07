import { Router } from 'express';
import { db, upsertRef } from '../db.js';
import { z } from 'zod';

const router = Router();

const recordSchema = z.object({
  w_datetime: z.string(),
  site: z.string().optional(),
  user_full_name: z.string().optional(),
  person_name: z.string().optional(),
  amount_due: z.number().optional(),
  gvm_fine: z.number().optional(),
  d1_fine: z.number().optional(),
  d2_fine: z.number().optional(),
  d3_fine: z.number().optional(),
  d4_fine: z.number().optional(),
  awkward_load_fine: z.number().optional(),
  amount_due_driver: z.number().optional(),
  total_revenue: z.number().optional()
});

const bulkSchema = z.object({
  source_filename: z.string().optional(),
  rows: z.array(recordSchema)
});

router.post('/bulk', (req, res) => {
  const parse = bulkSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { rows, source_filename } = parse.data;

  const tx = db.transaction((items) => {
    // Create upload batch
    const insUpload = db.prepare(`
      INSERT INTO excel_uploads (row_count, total_revenue, total_fines, source_filename)
      VALUES (@row_count, @total_revenue, @total_fines, @source_filename)
    `);

    const totals = items.reduce((acc, r) => {
      const t = (r.total_revenue ?? 0) +
        (r.amount_due ?? 0) + (r.gvm_fine ?? 0) + (r.d1_fine ?? 0) +
        (r.d2_fine ?? 0) + (r.d3_fine ?? 0) + (r.d4_fine ?? 0) +
        (r.awkward_load_fine ?? 0) + (r.amount_due_driver ?? 0);
      const fines = (r.gvm_fine ?? 0) + (r.d1_fine ?? 0) + (r.d2_fine ?? 0) +
        (r.d3_fine ?? 0) + (r.d4_fine ?? 0) + (r.awkward_load_fine ?? 0);
      acc.total += t; acc.fines += fines; return acc;
    }, { total: 0, fines: 0 });

    const uploadId = insUpload.run({
      row_count: items.length,
      total_revenue: totals.total,
      total_fines: totals.fines,
      source_filename: source_filename ?? null
    }).lastInsertRowid;

    const insRecord = db.prepare(`
      INSERT INTO weighbridge_records (
        upload_id, w_datetime, site_id, user_id, person_id,
        amount_due, gvm_fine, d1_fine, d2_fine, d3_fine, d4_fine,
        awkward_load_fine, amount_due_driver, total_revenue
      ) VALUES (@upload_id, @w_datetime, @site_id, @user_id, @person_id,
        @amount_due, @gvm_fine, @d1_fine, @d2_fine, @d3_fine, @d4_fine,
        @awkward_load_fine, @amount_due_driver, @total_revenue)
    `);

    for (const r of items) {
      const site_id = r.site ? upsertRef('sites', 'name', r.site.trim()) : null;
      const user_id = r.user_full_name ? upsertRef('users', 'full_name', r.user_full_name.trim()) : null;
      const person_id = r.person_name ? upsertRef('people', 'name', r.person_name.trim()) : null;

      insRecord.run({
        upload_id: uploadId,
        w_datetime: r.w_datetime,
        site_id,
        user_id,
        person_id,
        amount_due: r.amount_due ?? null,
        gvm_fine: r.gvm_fine ?? null,
        d1_fine: r.d1_fine ?? null,
        d2_fine: r.d2_fine ?? null,
        d3_fine: r.d3_fine ?? null,
        d4_fine: r.d4_fine ?? null,
        awkward_load_fine: r.awkward_load_fine ?? null,
        amount_due_driver: r.amount_due_driver ?? null,
        total_revenue: r.total_revenue ?? null
      });
    }

    return { uploadId, inserted: items.length };
  });

  try {
    const result = tx(rows);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to insert bulk records' });
  }
});

export default router;