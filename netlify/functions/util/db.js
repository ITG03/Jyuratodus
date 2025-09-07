// Minimal in-memory SQLite emulation using sql.js for Netlify functions
const initSqlJs = require('sql.js');

let _dbPromise = null;

async function getWasm() {
  // sql.js needs to fetch wasm file; Netlify provides /tmp to write
  const SQL = await initSqlJs({ locateFile: file => require('path').join(process.cwd(), 'public', 'sql-wasm.wasm') });
  return SQL;
}

async function getClient() {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const SQL = await getWasm();
      const db = new SQL.Database();
      return db;
    })();
  }
  const db = await _dbPromise;
  return {
    execute: async (q) => {
      if (typeof q === 'string') q = { sql: q };
      const stmt = db.prepare(q.sql);
      const rows = [];
      if (q.args) stmt.bind(q.args);
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return { rows };
    },
    prepare: (sql) => ({
      run: (args) => {
        const stmt = db.prepare(sql);
        stmt.run(args || []);
        stmt.free();
      }
    }),
    transaction: (fn) => async () => { await fn(); }
  };
}

function totalExpr() { return 'COALESCE(amount,0)'; }

async function migrate() {
  const db = await getClient();
  await db.execute(`CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`);
  await db.execute(`CREATE TABLE IF NOT EXISTS shifts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`);
  await db.execute(`CREATE TABLE IF NOT EXISTS people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, group_id INTEGER, shift_id INTEGER);`);
  await db.execute(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`);
  await db.execute(`CREATE TABLE IF NOT EXISTS weighbridge_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    truck_id TEXT,
    site TEXT,
    person_id INTEGER,
    impounded INTEGER,
    amount REAL
  );`);
}

module.exports = { getClient, migrate, totalExpr };