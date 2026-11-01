import db from '../config/db.js';

export async function createAuditLog({ req, action, oldValue = null, newValue = null, userOverride = null }) {
  try {
    const user = userOverride || req?.user;
    const userId = user?.id || null;
    const userName = user?.name || user?.login || 'Système';
    let role = user?.role || 'SYSTEM';
    if (role === 'SECRETAIRE' || role === 'AGENT_BO') {
      role = 'RESPONSABLE_BO';
    }
    
    let ipAddress = '127.0.0.1';
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    }

    const userAgent = req?.headers['user-agent'] || 'Direct execution';

    const oldValStr = oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : null;
    const newValStr = newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : null;
    
    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, role, ip_address, user_agent, action, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, userName, role, ipAddress, userAgent, action, oldValStr, newValStr]
    );
  } catch (err) {
    console.error('❌ Erreur enregistrement Audit Log PostgreSQL:', err);
  }
}
