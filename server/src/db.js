// SQLite connection using better-sqlite3
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'weighbridge.db');

// Ensure data dir exists is handled by folder creation in setup
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function runMigrations() {
  const ddl = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL UNIQUE,
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    group_id INTEGER,
    shift_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (shift_id)  REFERENCES shifts(id) ON UPDATE CASCADE ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS excel_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uploaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    row_count INTEGER NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0.0,
    total_fines REAL NOT NULL DEFAULT 0.0,
    source_filename TEXT
  );

  CREATE TABLE IF NOT EXISTS weighbridge_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id INTEGER,
    w_datetime TEXT NOT NULL,
    site_id INTEGER,
    user_id INTEGER,
    person_id INTEGER,
    amount_due REAL,
    gvm_fine REAL,
    d1_fine REAL,
    d2_fine REAL,
    d3_fine REAL,
    d4_fine REAL,
    awkward_load_fine REAL,
    amount_due_driver REAL,
    total_revenue REAL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    FOREIGN KEY (upload_id) REFERENCES excel_uploads(id) ON DELETE SET NULL,
    FOREIGN KEY (site_id)   REFERENCES sites(id)        ON DELETE SET NULL,
    FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE SET NULL,
    FOREIGN KEY (person_id) REFERENCES people(id)       ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_records_datetime ON weighbridge_records(w_datetime);
  CREATE INDEX IF NOT EXISTS idx_records_site ON weighbridge_records(site_id);
  CREATE INDEX IF NOT EXISTS idx_records_user ON weighbridge_records(user_id);
  CREATE INDEX IF NOT EXISTS idx_records_person ON weighbridge_records(person_id);
  `;

  db.exec(ddl);
}

export function upsertRef(table, nameField, value) {
  // Returns id for a unique text value in a ref table
  const select = db.prepare(`SELECT id FROM ${table} WHERE ${nameField} = ?`);
  const row = select.get(value);
  if (row) return row.id;
  const insert = db.prepare(`INSERT INTO ${table} (${nameField}) VALUES (?)`);
  return insert.run(value).lastInsertRowid;
}