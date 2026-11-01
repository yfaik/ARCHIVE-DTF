import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createAuditLog } from '../middleware/audit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dtf_benslimane_secret_jwt_key_2026_super_secure_987654321';

export async function login(req, res) {
  try {
    const { login, password } = req.body;

    console.log('\n=================== 🔐 AUTHENTICATION AUDIT LOG ===================');
    console.log(`📌 Received Login: "${login}"`);

    if (!login || !password) {
      console.log(`❌ Authentication Failed: Missing login or password.`);
      console.log('===================================================================\n');
      return res.status(400).json({
        success: false,
        message: 'Identifiants incomplets.',
        error: 'Identifiants incomplets.'
      });
    }

    const cleanLogin = String(login).trim();

    let user;
    try {
      user = await db.get('SELECT * FROM users WHERE LOWER(login) = LOWER($1)', [cleanLogin]);
    } catch (dbErr) {
      console.error('❌ [AUTH LOGIN DATABASE ERROR]: Impossible de contacter la base de données PostgreSQL / Neon:', dbErr);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: 'Erreur serveur'
      });
    }

    if (!user) {
      console.log(`❌ User Search Result: NOT FOUND in PostgreSQL/Neon database for login "${cleanLogin}".`);
      console.log('===================================================================\n');
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects.',
        error: 'Identifiants incorrects.'
      });
    }

    console.log(`✅ User Search Result: FOUND (ID: ${user.id}, Login: "${user.login}", Role: "${user.role}", Active: ${user.active})`);

    if (!user.active) {
      console.log(`❌ Account Status Check: INACTIVE (active=${user.active}).`);
      console.log('===================================================================\n');
      return res.status(403).json({
        success: false,
        message: 'Ce compte utilisateur a été désactivé. Veuillez contacter le Chef de Division.',
        error: 'Ce compte utilisateur a été désactivé. Veuillez contacter le Chef de Division.'
      });
    }

    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptErr) {
      console.error('❌ [AUTH BCRYPT ERROR]:', bcryptErr);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: 'Erreur serveur'
      });
    }

    if (!isValidPassword) {
      console.log(`❌ Password Verification: MISMATCH for user "${cleanLogin}".`);
      console.log('===================================================================\n');
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects.',
        error: 'Identifiants incorrects.'
      });
    }

    const token = jwt.sign(
      { id: user.id, login: user.login, role: user.role, service: user.service },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userPayload = {
      id: user.id,
      login: user.login,
      name: user.name,
      role: user.role,
      service: user.service
    };

    // Audit Log for Connexion (fail-safe)
    try {
      await createAuditLog({
        req,
        action: 'LOGIN',
        newValue: { login: user.login, role: user.role },
        userOverride: userPayload
      });
    } catch (auditErr) {
      console.warn('⚠️ Notification échec audit log login:', auditErr.message);
    }

    console.log(`🎉 Authentication Result: SUCCESS! JWT Token generated for user "${user.login}".`);
    console.log('===================================================================\n');

    return res.json({
      success: true,
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('❌ [AUTH LOGIN UNHANDLED ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: 'Erreur serveur'
    });
  }
}

export async function getMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié.',
        error: 'Non authentifié.'
      });
    }
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        login: req.user.login,
        name: req.user.name,
        role: req.user.role,
        service: req.user.service
      }
    });
  } catch (err) {
    console.error('❌ [AUTH GET ME ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: 'Erreur serveur'
    });
  }
}

export async function logout(req, res) {
  try {
    if (req.user) {
      await createAuditLog({
        req,
        action: 'LOGOUT',
        oldValue: { login: req.user.login }
      });
    }
    return res.json({
      success: true,
      message: 'Déconnexion réussie.'
    });
  } catch (err) {
    console.error('❌ [AUTH LOGOUT ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: 'Erreur serveur'
    });
  }
}
