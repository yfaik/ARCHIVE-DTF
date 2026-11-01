import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import { createAuditLog } from '../middleware/audit.js';
import { createNotification } from '../services/notification.service.js';

export async function getAllUsers(req, res) {
  try {
    const users = await db.all(
      `SELECT id, login, name, role, service, active, created_at, updated_at 
       FROM users ORDER BY created_at DESC`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
  }
}

export async function createUser(req, res) {
  try {
    const { login, name, password, role, service } = req.body;
    const cleanLogin = String(login || '').trim();

    if (!cleanLogin) {
      return res.status(400).json({ error: 'Le login est obligatoire.' });
    }

    // Check if login exists (login MUST be unique)
    const existing = await db.get('SELECT id FROM users WHERE login = ?', [cleanLogin]);
    if (existing) {
      return res.status(400).json({ error: 'Un utilisateur avec ce login existe déjà.' });
    }

    // Validate service if USER_SERVICE role
    if (role === 'USER_SERVICE' && !service) {
      return res.status(400).json({ error: 'Le service est obligatoire pour un utilisateur de service.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO users (login, password_hash, name, role, service, active)
       VALUES (?, ?, ?, ?, ?, true)`,
      [cleanLogin, passwordHash, String(name || '').trim(), role, role === 'USER_SERVICE' ? service : null]
    );

    const newUser = await db.get('SELECT id, login, name, role, service, active, created_at FROM users WHERE login = ?', [cleanLogin]);

    await createAuditLog({
      req,
      action: 'CREATION_UTILISATEUR',
      newValue: { login, name, role, service }
    });

    // Notify scoped target (specific service or Chef de Division)
    await createNotification({
      service: role === 'USER_SERVICE' ? service : null,
      role: role === 'USER_SERVICE' ? 'USER_SERVICE' : 'CHEF_DIVISION',
      title: 'Nouvel Utilisateur',
      message: `Compte créé pour ${name} (${role})`,
      type: 'info'
    });

    res.status(201).json(newUser);
  } catch (err) {
    console.error('Erreur création utilisateur:', err);
    res.status(500).json({ error: 'Erreur lors de la création de l utilisateur.' });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, role, service, active } = req.body;

    const oldUser = await db.get('SELECT id, login, name, role, service, active FROM users WHERE id = ?', [id]);
    if (!oldUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const newName = name !== undefined ? name : oldUser.name;
    const newRole = role !== undefined ? role : oldUser.role;
    const newService = newRole === 'USER_SERVICE' ? (service !== undefined ? service : oldUser.service) : null;
    const newActive = active !== undefined ? Boolean(active) : oldUser.active;

    await db.query(
      `UPDATE users 
       SET name = ?, role = ?, service = ?, active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newName, newRole, newService, newActive, id]
    );

    const updatedUser = await db.get('SELECT id, login, name, role, service, active, updated_at FROM users WHERE id = ?', [id]);

    await createAuditLog({
      req,
      action: 'MODIFICATION_UTILISATEUR',
      oldValue: oldUser,
      newValue: updatedUser
    });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l utilisateur.' });
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const oldUser = await db.get('SELECT id, login, active FROM users WHERE id = ?', [id]);
    if (!oldUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const newActive = Boolean(active);

    await db.query(
      `UPDATE users SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newActive, id]
    );

    const action = newActive ? 'ACTIVATION_UTILISATEUR' : 'DESACTIVATION_UTILISATEUR';

    await createAuditLog({
      req,
      action,
      oldValue: { active: oldUser.active },
      newValue: { active: newActive }
    });

    res.json({ message: `Utilisateur ${newActive ? 'activé' : 'désactivé'} avec succès.` });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la modification du statut utilisateur.' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const targetUser = await db.get('SELECT id, login FROM users WHERE id = ?', [id]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [passwordHash, id]
    );

    await createAuditLog({
      req,
      action: 'REINITIALISATION_MOT_DE_PASSE',
      oldValue: { user_id: id, login: targetUser.login },
      newValue: { message: 'Mot de passe réinitialisé' }
    });

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe.' });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const targetUser = await db.get('SELECT id, login, name, role, service, active FROM users WHERE id = ?', [id]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    // Prevent self deletion
    if (String(req.user.id) === String(targetUser.id)) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    // Prevent main admin account deletion
    if (targetUser.login === 'admin') {
      return res.status(400).json({ error: 'Le compte principal Chef de Division (admin) ne peut pas être supprimé.' });
    }

    // Check if deleting a CHEF_DIVISION leaves at least 1 active CHEF_DIVISION
    if (targetUser.role === 'CHEF_DIVISION') {
      const chefCountRes = await db.get('SELECT COUNT(*) as count FROM users WHERE role = "CHEF_DIVISION" AND active = true AND id != ?', [id]);
      const chefCount = parseInt(chefCountRes?.count || 0, 10);
      if (chefCount < 1) {
        return res.status(400).json({ error: 'Impossible de supprimer le seul compte Chef de Division actif.' });
      }
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);

    await createAuditLog({
      req,
      action: 'SUPPRESSION_UTILISATEUR',
      oldValue: { id: targetUser.id, login: targetUser.login, name: targetUser.name, role: targetUser.role, service: targetUser.service }
    });

    res.json({ message: `Utilisateur ${targetUser.login} supprimé avec succès.` });
  } catch (err) {
    console.error('Erreur suppression utilisateur:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de l utilisateur.' });
  }
}
