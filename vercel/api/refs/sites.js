const { getClient, migrate } = require('../_lib/db');

module.exports = async function handler(req, res) {
  try {
    await migrate();
    const db = getClient();
    const r = await db.execute('SELECT * FROM sites ORDER BY id DESC');
    return res.status(200).json(r.rows || []);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};