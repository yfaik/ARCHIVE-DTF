import {
  getScopedNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../services/notification.service.js';

/**
 * GET /api/notifications
 * Retrieves notifications scoped strictly by user role and assigned service.
 */
export async function getNotifications(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    }

    const notifications = await getScopedNotifications(req.user, {
      all: req.query.all === 'true'
    });

    res.json(notifications);
  } catch (err) {
    console.error('❌ Erreur getNotifications:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications.' });
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read.
 */
export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Identifiant de notification requis.' });
    }

    await markNotificationAsRead(id, req.user);
    res.json({ message: 'Notification marquée comme lue.' });
  } catch (err) {
    console.error('❌ Erreur markAsRead:', err);
    res.status(500).json({ error: 'Erreur mise à jour notification.' });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all scoped notifications as read for the current user.
 */
export async function markAllAsRead(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    }

    await markAllNotificationsAsRead(req.user);
    res.json({ message: 'Toutes les notifications ont été marquées comme lues.' });
  } catch (err) {
    console.error('❌ Erreur markAllAsRead:', err);
    res.status(500).json({ error: 'Erreur mise à jour des notifications.' });
  }
}
