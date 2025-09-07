// One-time migration script: call API directly or run locally to ingest a JSON dump
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, runMigrations, upsertRef } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

runMigrations();

const input = process.argv[2];
if (!input) {
  console.error('Usage: node src/migrate.js <path-to-export.json>');
  process.exit(1);
}

const full = path.isAbsolute(input) ? input : path.join(process.cwd(), input);
const payload = JSON.parse(fs.readFileSync(full, 'utf-8'));

// payload is expected to be the app export structure or a bulk format
const rows = payload.rows ?? (payload.excelData?.data ?? []);

const normalizeRow = (r) => ({
  w_datetime: r.wDateTime || r.w_datetime || r.date || r.wDate || r.w_datetime_iso,
  site: r.site || r.siteName || r.site_name,
  user_full_name: r.user || r.userFullName || r.user_full_name,
  person_name: r.person || r.person_name,
  amount_due: r.amountDue ?? r.amount_due,
  gvm_fine: r.gvmFine ?? r.gvm_fine,
  d1_fine: r.d1Fine ?? r.d1_fine,
  d2_fine: r.d2Fine ?? r.d2_fine,
  d3_fine: r.d3Fine ?? r.d3_fine,
  d4_fine: r.d4Fine ?? r.d4_fine,
  awkward_load_fine: r.awkwardLoadFine ?? r.awkward_load_fine,
  amount_due_driver: r.amountDueDriver ?? r.amount_due_driver,
  total_revenue: r.totalRevenue ?? r.total_revenue
});

const data = rows.map(normalizeRow).filter(r => !!r.w_datetime);

const tx = db.transaction((items) => {
  const insUpload = db.prepare(`
    INSERT INTO excel_uploads (row_count, total_revenue, total_fines, source_filename)
    VALUES (@row_count, @total_revenue, @source_filename)
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
    source_filename: path.basename(full)
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

const result = tx(data);
console.log(result);