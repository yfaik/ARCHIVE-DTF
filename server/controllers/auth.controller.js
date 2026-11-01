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
      console.log(`📤 Returned Response: 400 Bad Request`);
      console.log('===================================================================\n');
      return res.status(400).json({ error: 'Identifiants incomplets.' });
    }

    const cleanLogin = String(login).trim();
    const user = await db.get('SELECT * FROM users WHERE LOWER(login) = LOWER($1)', [cleanLogin]);

    if (!user) {
      console.log(`❌ User Search Result: NOT FOUND in PostgreSQL/Neon database for login "${cleanLogin}".`);
      console.log(`📤 Returned Response: 401 Unauthorized`);
      console.log('===================================================================\n');
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    console.log(`✅ User Search Result: FOUND (ID: ${user.id}, Login: "${user.login}", Role: "${user.role}", Active: ${user.active})`);
    console.log(`🔑 Stored Password Hash: "${user.password_hash}"`);

    if (!user.active) {
      console.log(`❌ Account Status Check: INACTIVE (active=${user.active}).`);
      console.log(`📤 Returned Response: 403 Forbidden`);
      console.log('===================================================================\n');
      return res.status(403).json({ error: 'Ce compte utilisateur a été désactivé. Veuillez contacter le Chef de Division.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`🔍 bcrypt.compare(providedPassword, storedHash) Result: ${isValidPassword}`);

    if (!isValidPassword) {
      console.log(`❌ Password Verification: MISMATCH (Invalid Password for user "${cleanLogin}").`);
      console.log(`📤 Returned Response: 401 Unauthorized`);
      console.log('===================================================================\n');
      return res.status(401).json({ error: 'Identifiants incorrects.' });
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

    // Audit Log for Connexion
    await createAuditLog({
      req,
      action: 'LOGIN',
      newValue: { login: user.login, role: user.role },
      userOverride: userPayload
    });

    console.log(`🎉 Authentication Result: SUCCESS! JWT Token generated for user "${user.login}".`);
    console.log(`📤 Returned Response: 200 OK with User payload & JWT Token`);
    console.log('===================================================================\n');

    res.json({
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('❌ Erreur de connexion PostgreSQL/Neon ou d authentification backend:', err);
    res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion.', details: err.message });
  }
}

export async function logout(req, res) {
  try {
    await createAuditLog({
      req,
      action: 'LOGOUT',
      oldValue: { login: req.user.login }
    });

    res.json({ message: 'Déconnexion réussie.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la déconnexion.' });
  }
}
