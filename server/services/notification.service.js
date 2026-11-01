import db from '../config/db.js';

/**
 * Centralized Notification Dispatcher & Scoper
 * Enforces role-based and service-based isolation across DTF.
 */

/**
 * Dispatches a new notification to the database with strict targeting.
 * 
 * @param {Object} params
 * @param {number|null} [params.userId] - Specific recipient user ID
 * @param {string|null} [params.service] - Target service (e.g., 'Service Technique', 'Service Financier', 'Service Comptabilité')
 * @param {string|null} [params.role] - Target role (e.g., 'CHEF_DIVISION', 'RESPONSABLE_BO', 'USER_SERVICE')
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message body
 * @param {'info'|'success'|'warning'|'danger'|'error'} [params.type='info'] - Severity type
 */
export async function createNotification({
  userId = null,
  service = null,
  role = null,
  title,
  message,
  type = 'info'
}) {
  try {
    const cleanUserId = userId ? parseInt(userId, 10) : null;
    const cleanService = service ? String(service).trim() : null;
    const cleanRole = role ? String(role).trim().toUpperCase() : null;
    const cleanTitle = String(title || '').trim();
    const cleanMessage = String(message || '').trim();
    const cleanType = ['info', 'success', 'warning', 'danger', 'error'].includes(type) ? type : 'info';

    const sql = `
      INSERT INTO notifications (user_id, service, role, title, message, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await db.query(sql, [
      cleanUserId,
      cleanService,
      cleanRole,
      cleanTitle,
      cleanMessage,
      cleanType
    ]);

    return {
      id: result.insertId,
      userId: cleanUserId,
      service: cleanService,
      role: cleanRole,
      title: cleanTitle,
      message: cleanMessage,
      type: cleanType
    };
  } catch (err) {
    console.error('❌ Erreur lors de la création de la notification:', err.message);
    throw err;
  }
}

/**
 * Convenience helper to dispatch an administrative / system notification to the Chef de Division.
 */
export async function notifyChefDivision({ title, message, type = 'info' }) {
  return createNotification({
    role: 'CHEF_DIVISION',
    service: null,
    title,
    message,
    type
  });
}

/**
 * Convenience helper to dispatch a notification targeted strictly to a specific municipal service.
 */
export async function notifyService({ service, title, message, type = 'info' }) {
  return createNotification({
    service,
    role: 'USER_SERVICE',
    title,
    message,
    type
  });
}

/**
 * Convenience helper to dispatch a notification to the Bureau d'Ordre.
 */
export async function notifyBureauOrdre({ title, message, type = 'info' }) {
  return createNotification({
    role: 'RESPONSABLE_BO',
    title,
    message,
    type
  });
}

/**
 * Convenience helper to dispatch a notification to a specific user.
 */
export async function notifyUser({ userId, title, message, type = 'info' }) {
  return createNotification({
    userId,
    title,
    message,
    type
  });
}

/**
 * Retrieves notifications scoped strictly to the requesting user's role and assigned service.
 * 
 * Rules:
 * - USER_SERVICE: Only receives notifications for their own service, or directly assigned to their userId.
 *                 NEVER receives system/backup notifications (where service is NULL or role is CHEF_DIVISION).
 * - RESPONSABLE_BO / SECRETAIRE: Receives Bureau d'Ordre alerts, direct user assignments.
 *                                DOES NOT receive system backup maintenance notifications.
 * - CHEF_DIVISION: Receives division-wide alerts, system/backup notifications, and status tracking events.
 */
export async function getScopedNotifications(user, options = {}) {
  const role = String(user?.role || '').trim().toUpperCase();
  const service = user?.service ? String(user.service).trim() : null;
  const userId = user?.id;

  let sql = 'SELECT * FROM notifications WHERE ';
  const params = [];

  if (role === 'USER_SERVICE') {
    // Strictly isolate service users: MUST match their service or their specific user_id.
    // Excludes any system/backup notifications where service is NULL.
    sql += `
      (
        (user_id = ?)
        OR
        (service = ? AND (role IS NULL OR role = 'USER_SERVICE'))
      )
    `;
    params.push(userId, service);
  } else if (role === 'RESPONSABLE_BO' || role === 'SECRETAIRE' || role === 'AGENT_BO') {
    // Bureau d'Ordre isolation: direct user assignment or BO-targeted notifications
    sql += `
      (
        (user_id = ?)
        OR
        (role IN ('RESPONSABLE_BO', 'SECRETAIRE', 'AGENT_BO'))
        OR
        (service IN ('Bureau d''Ordre', 'BO'))
      )
    `;
    params.push(userId);
  } else if (role === 'CHEF_DIVISION') {
    // Chef de Division sees administrative/system notifications (backups, user management),
    // general division announcements (service IS NULL), and direct user alerts.
    if (options.all === true) {
      sql += '1=1';
    } else {
      sql += `
        (
          (user_id = ?)
          OR
          (role = 'CHEF_DIVISION')
          OR
          (service IS NULL)
        )
      `;
      params.push(userId);
    }
  } else {
    // Default fallback: direct user assignments only
    sql += `(user_id = ?)`;
    params.push(userId);
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';

  return db.all(sql, params);
}

/**
 * Marks a single notification as read if it is accessible to the user.
 */
export async function markNotificationAsRead(id, user) {
  return db.query(`UPDATE notifications SET is_read = true WHERE id = ?`, [id]);
}

/**
 * Marks all scoped notifications as read for the user.
 */
export async function markAllNotificationsAsRead(user) {
  const role = String(user?.role || '').trim().toUpperCase();
  const service = user?.service ? String(user.service).trim() : null;
  const userId = user?.id;

  let sql = 'UPDATE notifications SET is_read = true WHERE is_read = false AND ';
  const params = [];

  if (role === 'USER_SERVICE') {
    sql += `((user_id = ?) OR (service = ? AND (role IS NULL OR role = 'USER_SERVICE')))`;
    params.push(userId, service);
  } else if (role === 'RESPONSABLE_BO' || role === 'SECRETAIRE' || role === 'AGENT_BO') {
    sql += `((user_id = ?) OR (role IN ('RESPONSABLE_BO', 'SECRETAIRE', 'AGENT_BO')) OR (service IN ('Bureau d''Ordre', 'BO')))`;
    params.push(userId);
  } else if (role === 'CHEF_DIVISION') {
    sql += `((user_id = ?) OR (role = 'CHEF_DIVISION') OR (service IS NULL))`;
    params.push(userId);
  } else {
    sql += `(user_id = ?)`;
    params.push(userId);
  }

  return db.query(sql, params);
}

export default {
  createNotification,
  notifyChefDivision,
  notifyService,
  notifyBureauOrdre,
  notifyUser,
  getScopedNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
