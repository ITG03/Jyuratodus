const { getClient, migrate } = require('./util/db');

async function readBody(event) { try { return JSON.parse(event.body || '{}'); } catch { return {}; } }

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
    await migrate();
    const db = getClient();
    const body = await readBody(event);
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const insert = db.prepare('INSERT INTO weighbridge_records (date, truck_id, site, person_id, impounded, amount) VALUES (?,?,?,?,?,?)');
    let count = 0;
    await db.transaction(() => {
      for (const r of rows) {
        insert.run([r.date || null, r.truckId || null, r.site || null, r.personId || null, r.impounded ? 1 : 0, r.amount || 0]);
        count++;
      }
    })();
    return { statusCode: 200, body: JSON.stringify({ inserted: count }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};