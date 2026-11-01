import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dtf_benslimane_secret_jwt_key_2026_super_secure_987654321';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Accès non autorisé. Jeton d authentification manquant.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch active user status from database
    const user = await db.get('SELECT id, login, name, role, service, active FROM users WHERE id = $1', [decoded.id]);

    if (!user || !user.active) {
      return res.status(403).json({ error: 'Compte utilisateur inactif ou supprimé.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Jeton d authentification invalide ou expiré.' });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    // Debug log to trace user context (id, login, role, service)
    console.log('🔍 [DEBUG RBAC] User Context:', req.user ? {
      id: req.user.id,
      login: req.user.login,
      name: req.user.name,
      role: req.user.role,
      service: req.user.service
    } : null);
    console.log('🔍 [DEBUG RBAC] Allowed Roles for Endpoint:', allowedRoles);

    if (!req.user || !req.user.role) {
      console.error('❌ [RBAC 403] Utilisateur non authentifié ou rôle inexistant.');
      return res.status(403).json({ error: 'Accès refusé. Informations utilisateur manquantes.' });
    }

    const rawRole = String(req.user.role).trim().toUpperCase();
    
    // Normalize aliases (SECRETAIRE <-> RESPONSABLE_BO <-> AGENT_BO)
    const boRoles = ['SECRETAIRE', 'RESPONSABLE_BO', 'AGENT_BO'];
    const userRoles = [rawRole];
    if (boRoles.includes(rawRole)) {
      userRoles.push(...boRoles);
    }

    const targetAllowed = allowedRoles.map(r => String(r).trim().toUpperCase());
    if (targetAllowed.some(r => boRoles.includes(r))) {
      targetAllowed.push(...boRoles);
    }

    const isAuthorized = userRoles.some(r => targetAllowed.includes(r));

    if (!isAuthorized) {
      console.error(`❌ [RBAC 403] Rôle utilisateur "${rawRole}" refusé. Rôles autorisés:`, allowedRoles);
      return res.status(403).json({ 
        error: `Permissions insuffisantes. Le rôle ${rawRole} n est pas autorisé.` 
      });
    }

    console.log(`✅ [RBAC 200] Accès validé pour le rôle "${rawRole}"`);
    next();
  };
}

export function enforceServiceAccess(req, res, next) {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ error: 'Accès non autorisé.' });
  }

  const role = String(req.user.role).trim().toUpperCase();

  // Chef de Division or Responsable Bureau d'Ordre have global access
  if (role === 'CHEF_DIVISION' || role === 'RESPONSABLE_BO' || role === 'SECRETAIRE' || role === 'AGENT_BO') {
    return next();
  }

  // If USER_SERVICE, restrict to user's assigned service
  if (role === 'USER_SERVICE') {
    if (!req.user.service) {
      return res.status(403).json({ error: 'Aucun service n est attribué à cet utilisateur.' });
    }
    req.serviceFilter = req.user.service;
  }

  next();
}
