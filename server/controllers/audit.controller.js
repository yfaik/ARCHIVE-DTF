import db from '../config/db.js';

export async function getAuditLogs(req, res) {
  try {
    const { action, user, date_from, date_to } = req.query;
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    let pIdx = 1;

    if (action) {
      params.push(`%${action}%`);
      sql += ` AND action ILIKE $${pIdx++}`;
    }

    if (user) {
      params.push(`%${user}%`);
      sql += ` AND user_name ILIKE $${pIdx++}`;
    }

    if (date_from) {
      params.push(date_from);
      sql += ` AND timestamp >= $${pIdx++}`;
    }

    if (date_to) {
      params.push(date_to);
      sql += ` AND timestamp <= $${pIdx++}`;
    }

    sql += ` ORDER BY timestamp DESC LIMIT 500`;

    const logs = await db.all(sql, params);
    res.json(logs);
  } catch (err) {
    console.error('Erreur getAuditLogs PostgreSQL:', err);
    res.status(500).json({ error: 'Erreur lors du chargement des journaux d audit.' });
  }
}
