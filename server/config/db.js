import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

// Delete obsolete JSON store if present
const jsonDbPath = path.join(__dirname, '../../data/dtf_store.json');
if (fs.existsSync(jsonDbPath)) {
  try {
    fs.unlinkSync(jsonDbPath);
    console.log('🗑️ Ancien fichier JSON dtf_store.json supprimé avec succès.');
  } catch (e) {
    // Ignore
  }
}

let pool = null;

// Helper to convert PostgreSQL $1, $2, ... syntax to MySQL ? syntax if present
function convertPgToMysqlSql(sql) {
  if (typeof sql !== 'string') return sql;
  return sql.replace(/\$\d+/g, '?');
}

// Initialize MySQL Database Connection Pool and Auto-create Schema
async function initMySQL() {
  try {
    const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.DB_URI;

    let poolConfig = {
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      multipleStatements: true,
      dateStrings: true
    };

    let isCloud = false;

    if (connectionUri) {
      console.log('🌐 Connexion MySQL via Connection URI (DATABASE_URL / MYSQL_URL)...');
      poolConfig.uri = connectionUri;
      isCloud = true;

      // Handle SSL for Cloud MySQL (Aiven, Railway, TiDB Cloud, Clever Cloud)
      // Enabled by default unless explicitly disabled via DB_SSL=false
      if (process.env.DB_SSL !== 'false') {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
    } else {
      console.log('🏠 Connexion MySQL via variables séparées (Host, Port, User, DB)...');
      const DB_HOST = process.env.DB_HOST || 'localhost';
      const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
      const DB_USER = process.env.DB_USER || process.env.DB_USERNAME || 'root';
      const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
      const DB_NAME = process.env.DB_NAME || process.env.DB_DATABASE || 'dtf_benslimane';

      poolConfig.host = DB_HOST;
      poolConfig.port = DB_PORT;
      poolConfig.user = DB_USER;
      poolConfig.password = DB_PASSWORD;
      poolConfig.database = DB_NAME;

      isCloud = DB_HOST !== 'localhost' && DB_HOST !== '127.0.0.1';

      if (process.env.DB_SSL === 'true' || (isCloud && process.env.DB_SSL !== 'false')) {
        poolConfig.ssl = { rejectUnauthorized: false };
      }

      // 1. Attempt to auto-create target database locally if root user permissions allow
      if (!isCloud || process.env.AUTO_CREATE_DB === 'true') {
        try {
          const rootConn = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD
          });

          const safeDbName = DB_NAME.replace(/`/g, '``');
          await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${safeDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
          await rootConn.end();
          console.log(`✨ Base de données MySQL "${DB_NAME}" vérifiée / créée avec succès.`);
        } catch (rootErr) {
          console.warn('ℹ️ Notification auto-création base MySQL:', rootErr.message);
        }
      }
    }

    // 2. Create MySQL Connection Pool
    pool = mysql.createPool(poolConfig);

    // Test connection
    const conn = await pool.getConnection();
    conn.release();
    console.log('✅ Pool de connexions MySQL établi avec succès.');

    // 3. Execute schema.sql automatically after connecting
    const schemaSqlPath = path.join(__dirname, '../db/schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      try {
        const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
        await pool.query(schemaSql);
        console.log('✨ Schéma de base de données vérifié / initialisé.');
      } catch (schemaErr) {
        console.warn('ℹ️ Notification exécution initialisation schema.sql:', schemaErr.message);
      }
    }

    // Dynamic migration for statut column (ENUM 'Nouveau', 'Transmis', 'En cours', 'Traité', ...)
    try {
      await pool.query(`
        ALTER TABLE courriers_arrives 
        MODIFY COLUMN statut ENUM('Nouveau', 'Transmis', 'En cours', 'Traité', 'NOUVEAU', 'TRANSMIS', 'EN_COURS', 'TRAITE') NOT NULL DEFAULT 'Nouveau'
      `);
      console.log("✨ Migration: Colonne 'statut' (Nouveau / Transmis / En cours / Traité) vérifiée avec succès.");
    } catch (migErr) {
      console.warn("⚠️ Migration statut notice:", migErr.message);
    }

    // Dynamic migration for audit / tracking columns (date_prise_en_charge, date_traitement, traite_par)
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM courriers_arrives LIKE 'date_traitement'");
      if (!cols || cols.length === 0) {
        await pool.query(`
          ALTER TABLE courriers_arrives
          ADD COLUMN date_prise_en_charge DATETIME NULL AFTER priorite,
          ADD COLUMN date_traitement DATETIME NULL AFTER date_prise_en_charge,
          ADD COLUMN traite_par VARCHAR(150) NULL AFTER date_traitement
        `);
        console.log("✨ Migration: Colonnes de suivi (date_prise_en_charge, date_traitement, traite_par) créées avec succès.");
      }
    } catch (migTrackErr) {
      console.warn("⚠️ Migration tracking notice:", migTrackErr.message);
    }

    // Dynamic migration for priorite column (ENUM 'Normal', 'Urgent', 'Très Urgent')
    try {
      const [pCols] = await pool.query("SHOW COLUMNS FROM courriers_arrives LIKE 'priorite'");
      if (!pCols || pCols.length === 0) {
        await pool.query("ALTER TABLE courriers_arrives ADD COLUMN priorite ENUM('Normal', 'Urgent', 'Très Urgent') NOT NULL DEFAULT 'Normal'");
        try {
          await pool.query("ALTER TABLE courriers_arrives ADD INDEX idx_arrives_priorite (priorite)");
        } catch (idxErr) {
          // Index might already exist
        }
        console.log("✨ Migration: Colonne 'priorite' (Normal / Urgent / Très Urgent) créée avec succès.");
      } else {
        await pool.query("ALTER TABLE courriers_arrives MODIFY COLUMN priorite ENUM('Normal', 'Urgent', 'Très Urgent') NOT NULL DEFAULT 'Normal'");
        console.log("✨ Migration: Colonne 'priorite' vérifiée avec succès.");
      }
    } catch (migPrioriteErr) {
      console.warn("⚠️ Migration priorite notice:", migPrioriteErr.message);
    }

    // Dynamic migration for services table & service_expediteur_id column in courriers_departs
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS services (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          nom VARCHAR(150) NOT NULL UNIQUE,
          code VARCHAR(50) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await pool.query(`
        INSERT INTO services (id, nom, code) VALUES
          (1, 'Service Technique', 'TECH'),
          (2, 'Service Financier', 'FIN'),
          (3, 'Service Comptabilité', 'COMPTA'),
          (4, 'Chef de Division', 'CHEF')
        ON DUPLICATE KEY UPDATE nom = VALUES(nom);
      `);

      // Ensure ENUM includes 'Chef de Division'
      try {
        await pool.query(`
          ALTER TABLE courriers_arrives 
          MODIFY COLUMN service_destinataire ENUM('Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division') NOT NULL
        `);
        await pool.query(`
          ALTER TABLE users 
          MODIFY COLUMN service ENUM('Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division') NULL
        `);
      } catch (enumErr) {
        // Ignore if already modified
      }

      const [depCols] = await pool.query("SHOW COLUMNS FROM courriers_departs LIKE 'service_expediteur_id'");
      if (!depCols || depCols.length === 0) {
        await pool.query("ALTER TABLE courriers_departs ADD COLUMN service_expediteur_id BIGINT NULL");
        try {
          await pool.query("ALTER TABLE courriers_departs ADD CONSTRAINT fk_departs_service FOREIGN KEY (service_expediteur_id) REFERENCES services(id) ON DELETE SET NULL");
        } catch (e) {
          // Ignore
        }
      }
      console.log("✨ Migration: Table 'services' (incluant Chef de Division) et colonne 'service_expediteur_id' vérifiées avec succès.");
    } catch (migDepErr) {
      console.warn("⚠️ Migration courriers_departs notice:", migDepErr.message);
    }

    // Dynamic migration for audit_logs role (SECRETAIRE -> RESPONSABLE_BO)
    try {
      await pool.query("UPDATE audit_logs SET role = 'RESPONSABLE_BO' WHERE role IN ('SECRETAIRE', 'Secrétaire', 'secretaire')");
    } catch (migAuditErr) {
      // Ignore
    }

    // Dynamic migration for users table role enum and accounts (SECRETAIRE -> RESPONSABLE_BO)
    try {
      await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE') NOT NULL");
      await pool.query("UPDATE users SET role = 'RESPONSABLE_BO' WHERE login IN ('youness', 'secretaire') OR role = 'SECRETAIRE'");
    } catch (migUsersRoleErr) {
      console.warn("⚠️ Migration users role notice:", migUsersRoleErr.message);
    }

    // Dynamic migration for notifications table (add role column & backfill role-based scoping)
    try {
      const [notifCols] = await pool.query("SHOW COLUMNS FROM notifications LIKE 'role'");
      if (!notifCols || notifCols.length === 0) {
        await pool.query("ALTER TABLE notifications ADD COLUMN role VARCHAR(50) NULL AFTER service, ADD INDEX idx_notif_role (role)");
        console.log("✨ Migration: Colonne 'role' ajoutée à la table notifications.");
      }
      await pool.query(`
        UPDATE notifications 
        SET role = 'CHEF_DIVISION' 
        WHERE role IS NULL AND (
          title LIKE '%Sauvegarde%' OR 
          title LIKE '%Échec Sauvegarde%' OR 
          title LIKE '%Utilisateur%' OR 
          title LIKE 'Courrier en cours%' OR 
          title LIKE 'Courrier traité%'
        )
      `);
      await pool.query(`
        UPDATE notifications 
        SET role = 'USER_SERVICE' 
        WHERE role IS NULL AND service IS NOT NULL
      `);
      console.log("✨ Migration: Scoping des notifications existantes vérifié/mis à jour.");
    } catch (migNotifErr) {
      console.warn("⚠️ Migration notifications role notice:", migNotifErr.message);
    }

    console.log(`✅ Base de données MySQL connectée et schéma vérifié avec succès.`);
  } catch (err) {
    console.error(`⚠️ Erreur de connexion MySQL:`, err.message);
    throw err;
  }
}

// Lazy initialization wrapper
const getPool = async () => {
  if (!pool) {
    await initMySQL();
  }
  return pool;
};

const dbAdapter = {
  engine: 'mysql',

  async query(sql, params = []) {
    const p = await getPool();
    const mysqlSql = convertPgToMysqlSql(sql);
    const safeParams = params.map(val => (val === undefined ? null : val));
    
    const [result] = await p.query(mysqlSql, safeParams);

    if (Array.isArray(result)) {
      // SELECT query result
      return {
        rows: result,
        rowCount: result.length,
        insertId: null
      };
    } else {
      // DML (INSERT/UPDATE/DELETE) result
      return {
        rows: [],
        rowCount: result.affectedRows || 0,
        insertId: result.insertId || null
      };
    }
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
  }
};

export default dbAdapter;
