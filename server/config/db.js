import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from all potential .env locations
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

let pool = null;

/**
 * Utility helper to safely convert MySQL question mark placeholders '?' to PostgreSQL '$1', '$2', ...
 * preserves string literals and ignores placeholders inside quotes.
 */
export function convertQuestionMarksToDollars(sql) {
  if (typeof sql !== 'string' || !sql.includes('?')) return sql;

  let paramIndex = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    if (char === "'" && (i === 0 || sql[i - 1] !== '\\')) {
      inSingleQuote = !inSingleQuote;
      result += char;
    } else if (char === '"' && (i === 0 || sql[i - 1] !== '\\')) {
      inDoubleQuote = !inDoubleQuote;
      result += char;
    } else if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      result += `$${paramIndex++}`;
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Initialize PostgreSQL / Neon Database Connection Pool and Auto-verify Schema
 */
async function initPostgreSQL() {
  try {
    const rawUri = 
      process.env.DATABASE_URL || 
      process.env.POSTGRES_URL || 
      process.env.NEON_DATABASE_URL || 
      process.env.DB_URI;

    const connectionUri = rawUri ? String(rawUri).trim().replace(/^['"]|['"]$/g, '') : null;

    let poolConfig = {
      max: process.env.VERCEL ? 5 : 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    };

    if (connectionUri) {
      console.log('🌐 Connexion PostgreSQL / Neon via Connection URI (DATABASE_URL)...');
      poolConfig.connectionString = connectionUri;

      // Always enable SSL with rejectUnauthorized: false for Neon Tech & cloud PostgreSQL
      poolConfig.ssl = { rejectUnauthorized: false };
    } else {
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        console.error('❌ [DATABASE CONFIG ERROR]: Variable DATABASE_URL manquante dans l environnement Vercel / Production !');
        throw new Error("Variable d'environnement DATABASE_URL manquante. Veuillez la configurer dans le tableau de bord Vercel.");
      }

      console.log('🏠 Connexion PostgreSQL via variables séparées locales...');
      const DB_HOST = process.env.DB_HOST || process.env.PGHOST || 'localhost';
      const DB_PORT = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
      const DB_USER = process.env.DB_USER || process.env.DB_USERNAME || process.env.PGUSER || 'postgres';
      const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.PGPASSWORD || '');
      const DB_NAME = process.env.DB_NAME || process.env.DB_DATABASE || process.env.PGDATABASE || 'dtf_benslimane';

      poolConfig.host = DB_HOST;
      poolConfig.port = DB_PORT;
      poolConfig.user = DB_USER;
      poolConfig.password = DB_PASSWORD;
      poolConfig.database = DB_NAME;

      const isRemote = DB_HOST !== 'localhost' && DB_HOST !== '127.0.0.1';
      if (process.env.DB_SSL === 'true' || isRemote || process.env.DB_SSL !== 'false') {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
    }

    const newPool = new Pool(poolConfig);

    newPool.on('error', (err) => {
      console.error('⚠️ [PG POOL ERROR] Erreur inattendue sur client PostgreSQL idle:', err);
    });

    // Test connection with timeout
    const client = await newPool.connect();
    try {
      const res = await client.query('SELECT current_database(), current_user, version()');
      const info = res.rows[0];
      console.log(`✅ Connexion PostgreSQL / Neon établie avec succès.`);
      console.log(`📌 Base active: ${info?.current_database} | Utilisateur: ${info?.current_user}`);
    } finally {
      client.release();
    }

    // Set active pool only after successful test
    pool = newPool;

    // Auto-verify / create schema if tables don't exist yet (skip in serverless cold starts if not required)
    if (!process.env.VERCEL) {
      try {
        const checkTables = await pool.query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
        );
        const tableCount = parseInt(checkTables.rows[0]?.count || 0, 10);

        if (tableCount === 0) {
          console.log('🌱 Initialisation du schéma PostgreSQL / Neon depuis schema.sql...');
          const schemaPath = path.join(__dirname, '../db/schema.sql');
          const neonSchemaPath = path.join(__dirname, '../../neon_schema.sql');
          const targetPath = fs.existsSync(neonSchemaPath) ? neonSchemaPath : schemaPath;

          if (fs.existsSync(targetPath)) {
            const schemaSql = fs.readFileSync(targetPath, 'utf8');
            await pool.query(schemaSql);
            console.log('✨ Schéma PostgreSQL / Neon créé et seedé avec succès.');
          }
        }
      } catch (schemaErr) {
        console.warn('ℹ️ Notification vérification schéma PostgreSQL:', schemaErr.message);
      }
    }

  } catch (err) {
    pool = null; // Reset pool on error to allow clean retries on next request
    console.error('❌ [DATABASE INIT ERROR] Échec d initialisation PostgreSQL / Neon:', err.message);
    throw err;
  }
}

/**
 * Lazy initialization wrapper for connection pool
 */
export const getPool = async () => {
  if (!pool) {
    await initPostgreSQL();
  }
  return pool;
};

/**
 * Universal Database Adapter with PostgreSQL (pg) engine
 */
const dbAdapter = {
  engine: 'postgres',

  async query(sql, params = []) {
    const p = await getPool();
    const pgSql = convertQuestionMarksToDollars(sql);
    const safeParams = params.map(val => (val === undefined ? null : val));

    const result = await p.query(pgSql, safeParams);

    // Extract potential insertId if RETURNING id was used, or from single row
    let insertId = null;
    if (result.rows && result.rows.length > 0 && result.rows[0].id !== undefined) {
      insertId = result.rows[0].id;
    }

    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
      insertId
    };
  },

  async get(sql, params = []) {
    const res = await this.query(sql, params);
    if (Array.isArray(res.rows)) {
      return res.rows[0] || null;
    }
    return null;
  },

  async all(sql, params = []) {
    const res = await this.query(sql, params);
    if (Array.isArray(res.rows)) {
      return res.rows;
    }
    return [];
  },

  async execute(sql, params = []) {
    return this.query(sql, params);
  },

  async getClient() {
    const p = await getPool();
    return p.connect();
  }
};

export default dbAdapter;
