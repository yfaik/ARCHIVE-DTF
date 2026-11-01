import db from '../config/db.js';

export async function getAuditLogs(req, res) {
  try {
    const { action, user, date_from, date_to } = req.query;
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];

    if (action) {
      params.push(`%${action}%`);
      sql += ` AND action LIKE ?`;
    }

    if (user) {
      params.push(`%${user}%`);
      sql += ` AND user_name LIKE ?`;
    }

    if (date_from) {
      params.push(date_from);
      sql += ` AND timestamp >= ?`;
    }

    if (date_to) {
      params.push(date_to);
      sql += ` AND timestamp <= ?`;
    }

    sql += ` ORDER BY timestamp DESC LIMIT 500`;

    const logs = await db.all(sql, params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du chargement des journaux d audit.' });
  }
}
