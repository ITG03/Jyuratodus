const { getClient, migrate } = require('./util/db');

exports.handler = async () => {
  try {
    await migrate();
    const db = getClient();
    const r = await db.execute('SELECT * FROM users ORDER BY id DESC');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.rows || []) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};