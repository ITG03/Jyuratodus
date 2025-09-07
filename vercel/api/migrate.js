import pool from './_lib/db.js';

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-migrate-secret'];
  if (!process.env.MIGRATE_SECRET || secret !== process.env.MIGRATE_SECRET) {
    return res.status(403).json({ error: 'migration secret required' });
  }

  const ddl = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL UNIQUE,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS people (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    group_id INTEGER REFERENCES groups(id) ON UPDATE CASCADE ON DELETE SET NULL,
    shift_id INTEGER REFERENCES shifts(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS excel_uploads (
    id SERIAL PRIMARY KEY,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_count INTEGER NOT NULL DEFAULT 0,
    total_revenue DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_fines DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    source_filename TEXT
  );

  CREATE TABLE IF NOT EXISTS weighbridge_records (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER REFERENCES excel_uploads(id) ON DELETE SET NULL,
    w_datetime TIMESTAMPTZ NOT NULL,
    site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
    amount_due DOUBLE PRECISION,
    gvm_fine DOUBLE PRECISION,
    d1_fine DOUBLE PRECISION,
    d2_fine DOUBLE PRECISION,
    d3_fine DOUBLE PRECISION,
    d4_fine DOUBLE PRECISION,
    awkward_load_fine DOUBLE PRECISION,
    amount_due_driver DOUBLE PRECISION,
    total_revenue DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_records_datetime ON weighbridge_records(w_datetime);
  CREATE INDEX IF NOT EXISTS idx_records_site ON weighbridge_records(site_id);
  CREATE INDEX IF NOT EXISTS idx_records_user ON weighbridge_records(user_id);
  CREATE INDEX IF NOT EXISTS idx_records_person ON weighbridge_records(person_id);
  `;

  try {
    await pool.query(ddl);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
}
