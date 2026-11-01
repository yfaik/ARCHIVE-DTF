import cron from 'node-cron';
import archiver from 'archiver';
import unzipper from 'unzipper';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/db.js';
import { notifyChefDivision } from './notification.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupDir = path.resolve(__dirname, '../backups');
const uploadDir = path.resolve(__dirname, '../uploads/pdfs');
const baseUploadDir = path.resolve(__dirname, '../uploads');

// Ensure directories exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Global execution mutex to prevent concurrent backup jobs
let isBackupRunning = false;

/**
 * Escapes values for safe standard PostgreSQL SQL dumps.
 */
function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return 'NULL';
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString('hex')}'`;
  }
  if (typeof val === 'object') {
    try {
      val = JSON.stringify(val);
    } catch {
      val = String(val);
    }
  }
  const escaped = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u001a/g, '\\Z');
  return `'${escaped}'`;
}

/**
 * Generates a structured, lightweight SQL dump for PostgreSQL.
 * Includes schema (DDL) and clean batched INSERT statements.
 */
export async function generateDatabaseDump(targetDateStr = new Date().toISOString().split('T')[0]) {
  let dumpSql = '';

  // 1. SQL Header & Environment Configuration
  dumpSql += `-- =============================================================================\n`;
  dumpSql += `-- DTF Commune de Benslimane - Sauvegarde Quotidienne PostgreSQL\n`;
  dumpSql += `-- Date de génération : ${new Date().toISOString()}\n`;
  dumpSql += `-- Date ciblée       : ${targetDateStr}\n`;
  dumpSql += `-- Base de données   : ${process.env.DB_NAME || 'dtf_benslimane'}\n`;
  dumpSql += `-- Moteur BD         : PostgreSQL / Neon Tech\n`;
  dumpSql += `-- =============================================================================\n\n`;

  // 2. Fetch list of tables dynamically
  let tables = [];
  try {
    const rawTables = await db.all("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    tables = rawTables.map(r => r.table_name || Object.values(r)[0]);
  } catch (err) {
    console.warn('⚠️ Échec de la récupération des tables, utilisation de la liste ordonnée par défaut:', err.message);
    tables = ['services', 'users', 'courriers_arrives', 'courriers_departs', 'audit_logs', 'notifications'];
  }

  // Logical table ordering to ensure parent foreign keys exist first
  const tablePriority = ['services', 'users', 'courriers_arrives', 'courriers_departs', 'audit_logs', 'notifications'];
  tables.sort((a, b) => {
    const idxA = tablePriority.indexOf(a);
    const idxB = tablePriority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // 3. Activity Summary Comment for Today
  try {
    const arrivesToday = await db.all(
      "SELECT COUNT(*) as count FROM courriers_arrives WHERE DATE(created_at) = $1 OR DATE(updated_at) = $2",
      [targetDateStr, targetDateStr]
    );
    const departsToday = await db.all(
      "SELECT COUNT(*) as count FROM courriers_departs WHERE DATE(created_at) = $1 OR DATE(updated_at) = $2",
      [targetDateStr, targetDateStr]
    );
    const auditToday = await db.all(
      "SELECT COUNT(*) as count FROM audit_logs WHERE DATE(timestamp) = $1",
      [targetDateStr]
    );

    dumpSql += `-- -----------------------------------------------------------------------------\n`;
    dumpSql += `-- Synthèse d'activité du ${targetDateStr} :\n`;
    dumpSql += `--   - Courriers Arrivés (créés/modifiés) : ${arrivesToday[0]?.count || 0}\n`;
    dumpSql += `--   - Courriers Départs (créés/modifiés) : ${departsToday[0]?.count || 0}\n`;
    dumpSql += `--   - Événements d'audit enregistrés    : ${auditToday[0]?.count || 0}\n`;
    dumpSql += `-- -----------------------------------------------------------------------------\n\n`;
  } catch (statsErr) {
    console.warn("⚠️ Impossible de calculer la synthèse d'activité:", statsErr.message);
  }

  // 4. Dump table structures and data
  for (const tableName of tables) {
    try {
      dumpSql += `-- -----------------------------------------------------------------------------\n`;
      dumpSql += `-- Contenu de la table "${tableName}"\n`;
      dumpSql += `-- -----------------------------------------------------------------------------\n`;

      const rows = await db.all(`SELECT * FROM "${tableName}"`);

      if (!rows || rows.length === 0) {
        dumpSql += `-- (Aucune donnée dans la table "${tableName}")\n\n`;
        continue;
      }

      const columns = Object.keys(rows[0]);
      const columnsSql = columns.map(c => `"${c}"`).join(', ');

      // Batch INSERT statements into chunks of 100 rows
      const BATCH_SIZE = 100;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const valuesRows = batch.map(row => {
          const rowVals = columns.map(col => escapeSqlValue(row[col])).join(', ');
          return `  (${rowVals})`;
        }).join(',\n');

        dumpSql += `INSERT INTO "${tableName}" (${columnsSql}) VALUES\n${valuesRows}\nON CONFLICT DO NOTHING;\n`;
      }
      dumpSql += `\n`;
    } catch (tblErr) {
      console.error(`⚠️ Erreur lors de l'export de la table "${tableName}":`, tblErr.message);
      dumpSql += `-- AVERTISSEMENT : Erreur lors de l'export de "${tableName}": ${tblErr.message}\n\n`;
    }
  }

  dumpSql += `-- Fin de l'export PostgreSQL\n`;

  return dumpSql;
}

/**
 * Incremental Daily PDF Scanner:
 * Inspects file metadata (birthtime and mtime) and returns files matching targetDateStr.
 */
export function getDailyUploadFiles(targetDateStr = new Date().toISOString().split('T')[0]) {
  const matchedFiles = [];
  const candidateDirs = [uploadDir, baseUploadDir];
  const seenPaths = new Set();

  for (const dir of candidateDirs) {
    try {
      if (!fs.existsSync(dir)) continue;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const fullPath = path.join(dir, entry.name);
        if (seenPaths.has(fullPath)) continue;
        seenPaths.add(fullPath);

        try {
          const stat = fs.statSync(fullPath);

          let birthStr = null;
          if (stat.birthtime instanceof Date && !isNaN(stat.birthtime.getTime())) {
            birthStr = stat.birthtime.toISOString().split('T')[0];
          }

          let mtimeStr = null;
          if (stat.mtime instanceof Date && !isNaN(stat.mtime.getTime())) {
            mtimeStr = stat.mtime.toISOString().split('T')[0];
          }

          if (birthStr === targetDateStr || mtimeStr === targetDateStr) {
            matchedFiles.push({
              name: entry.name,
              fullPath,
              size: stat.size,
              birthtime: stat.birthtime,
              mtime: stat.mtime
            });
          }
        } catch (statErr) {
          console.warn(`⚠️ Impossible de lire les métadonnées de ${entry.name}:`, statErr.message);
        }
      }
    } catch (dirErr) {
      console.error(`⚠️ Erreur lors de la lecture du répertoire d'uploads ${dir}:`, dirErr.message);
    }
  }

  return matchedFiles;
}

/**
 * Scheduled Backup Cron (Every day at 17:00) -> 0 17 * * *
 */
export function initBackupScheduler() {
  cron.schedule('0 17 * * *', async () => {
    console.log('⏰ Exécution planifiée de la sauvegarde quotidienne PostgreSQL (17h00)...');
    try {
      await createBackup('Daily');
      console.log('✅ Sauvegarde quotidienne automatique terminée avec succès.');
    } catch (err) {
      console.error('❌ Erreur critique lors de la sauvegarde automatique quotidienne:', err);
      try {
        await notifyChefDivision({
          title: 'Échec Sauvegarde Quotidienne',
          message: `Erreur lors de la sauvegarde automatique : ${err.message}`,
          type: 'error'
        });
      } catch (_) {}
    }
  });
  console.log('📅 Planificateur de sauvegardes quotidiennes (17h00) PostgreSQL activé.');
}

/**
 * Creates a clean incremental daily backup ZIP archive containing:
 * - db_dump_YYYY-MM-DD.sql
 * - uploads/today/ (with today's PDFs, or .gitkeep if none)
 * 
 * Target archive name: DTF_BACKUP_Daily_YYYY-MM-DD.zip
 */
export async function createBackup(prefix = 'Daily', options = {}) {
  if (isBackupRunning) {
    console.warn('⚠️ Une opération de sauvegarde est déjà en cours d\'exécution.');
    throw new Error('Une sauvegarde est déjà en cours d\'exécution.');
  }

  isBackupRunning = true;

  try {
    const targetDateStr = options.date || new Date().toISOString().split('T')[0];
    const backupFileName = prefix === 'Daily'
      ? `DTF_BACKUP_Daily_${targetDateStr}.zip`
      : `DTF_BACKUP_${prefix}_${targetDateStr}.zip`;

    const backupPath = path.join(backupDir, backupFileName);
    const tempBackupPath = `${backupPath}.tmp-${Date.now()}`;

    console.log(`📦 Début de création de la sauvegarde : ${backupFileName}`);

    const output = fs.createWriteStream(tempBackupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return await new Promise((resolve, reject) => {
      let isSettled = false;

      output.on('close', async () => {
        try {
          // Atomically replace target backup file
          if (fs.existsSync(backupPath)) {
            try { fs.unlinkSync(backupPath); } catch (_) {}
          }
          fs.renameSync(tempBackupPath, backupPath);

          const finalStat = fs.statSync(backupPath);
          console.log(`📦 Sauvegarde finalisée: ${backupFileName} (${finalStat.size} octets)`);

          // Apply 30-day retention cleanup
          try {
            await cleanOldBackups();
          } catch (cleanErr) {
            console.error('⚠️ Erreur lors du nettoyage des anciennes sauvegardes:', cleanErr.message);
          }

          // Register success notification (scoped strictly to Chef de Division)
          try {
            await notifyChefDivision({
              title: 'Sauvegarde Terminée',
              message: `Sauvegarde quotidienne ${backupFileName} créée avec succès (${Math.round(finalStat.size / 1024)} Ko).`,
              type: 'success'
            });
          } catch (notifErr) {
            console.warn('⚠️ Notification de sauvegarde non enregistrée en BDD:', notifErr.message);
          }

          isSettled = true;
          resolve({
            fileName: backupFileName,
            size: finalStat.size,
            path: backupPath,
            date: targetDateStr
          });
        } catch (postErr) {
          if (!isSettled) reject(postErr);
        }
      });

      output.on('error', (err) => {
        console.error('❌ Erreur du flux de sortie de la sauvegarde:', err);
        if (fs.existsSync(tempBackupPath)) {
          try { fs.unlinkSync(tempBackupPath); } catch (_) {}
        }
        if (!isSettled) reject(err);
      });

      archive.on('warning', (err) => {
        console.warn('⚠️ Avertissement archiver:', err.message);
      });

      archive.on('error', (err) => {
        console.error('❌ Erreur archiver:', err);
        if (fs.existsSync(tempBackupPath)) {
          try { fs.unlinkSync(tempBackupPath); } catch (_) {}
        }
        if (!isSettled) reject(err);
      });

      archive.pipe(output);

      // Async process to assemble archive contents
      (async () => {
        try {
          // 1. Structured Database SQL Dump (db_dump_YYYY-MM-DD.sql)
          const sqlDumpFileName = `db_dump_${targetDateStr}.sql`;
          try {
            const sqlDump = await generateDatabaseDump(targetDateStr);
            archive.append(sqlDump, { name: sqlDumpFileName });
            console.log(`   + Base de données exportée : ${sqlDumpFileName}`);
          } catch (sqlErr) {
            console.error('❌ Erreur génération dump SQL:', sqlErr);
            archive.append(`-- ERREUR DUMP SQL: ${sqlErr.message}\n`, { name: sqlDumpFileName });
          }

          // 2. Incremental Daily PDF Backup (/uploads/today/)
          try {
            const todayFiles = getDailyUploadFiles(targetDateStr);

            if (todayFiles.length === 0) {
              console.log(`ℹ️ Aucun nouveau fichier PDF uploadé aujourd'hui (${targetDateStr}). Structure maintenue sans erreur.`);
              // Handle cleanly without breaking the ZIP archive process
              archive.append('', { name: 'uploads/today/.gitkeep' });
            } else {
              console.log(`📎 ${todayFiles.length} fichier(s) uploadé(s) aujourd'hui (${targetDateStr}) ajoutés à /uploads/today/ :`);
              for (const file of todayFiles) {
                try {
                  if (fs.existsSync(file.fullPath)) {
                    archive.file(file.fullPath, { name: `uploads/today/${file.name}` });
                    console.log(`      * ${file.name} (${file.size} octets)`);
                  } else {
                    console.warn(`⚠️ Fichier introuvable lors de l'archivage: ${file.fullPath}`);
                  }
                } catch (addErr) {
                  console.warn(`⚠️ Erreur d'ajout de ${file.name}:`, addErr.message);
                }
              }
            }
          } catch (pdfErr) {
            console.error('⚠️ Erreur préparation PDFs:', pdfErr.message);
            archive.append('', { name: 'uploads/today/.gitkeep' });
          }

          // Finalize the archive stream
          await archive.finalize();
        } catch (feedErr) {
          console.error('❌ Erreur lors de l\'alimentation de l\'archive:', feedErr);
          if (!isSettled) reject(feedErr);
        }
      })();
    });
  } finally {
    isBackupRunning = false;
  }
}

/**
 * 30-Day Retention Cleanup Logic:
 * - Deletes any backup ZIP files older than 30 days.
 * - Enforces keeping a maximum of the 30 most recent archives.
 */
export async function cleanOldBackups() {
  try {
    if (!fs.existsSync(backupDir)) return;

    const rawFiles = fs.readdirSync(backupDir);
    const files = [];

    for (const f of rawFiles) {
      if (!f.startsWith('DTF_BACKUP_') || !f.endsWith('.zip')) continue;
      const filePath = path.join(backupDir, f);
      try {
        const stat = fs.statSync(filePath);
        files.push({
          name: f,
          path: filePath,
          mtime: stat.mtime,
          size: stat.size
        });
      } catch (statErr) {
        console.warn(`⚠️ Erreur de lecture des métadonnées de ${f}:`, statErr.message);
      }
    }

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    // 1. Delete backup files older than 30 days
    const remaining = [];
    for (const file of files) {
      const ageMs = now - file.mtime.getTime();
      if (ageMs > THIRTY_DAYS_MS) {
        try {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Ancienne sauvegarde nettoyée (> 30 jours) : ${file.name}`);
        } catch (delErr) {
          console.warn(`⚠️ Erreur suppression fichier expiré ${file.name}:`, delErr.message);
        }
      } else {
        remaining.push(file);
      }
    }

    // 2. Enforce retention limit (maximum 30 backup files)
    remaining.sort((a, b) => b.mtime - a.mtime);
    if (remaining.length > 30) {
      const toDelete = remaining.slice(30);
      for (const item of toDelete) {
        try {
          fs.unlinkSync(item.path);
          console.log(`🗑️ Ancienne sauvegarde nettoyée (limite 30 dépassée) : ${item.name}`);
        } catch (delErr) {
          console.warn(`⚠️ Erreur suppression ancien backup ${item.name}:`, delErr.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Erreur lors du nettoyage automatique des sauvegardes:', err.message);
  }
}

/**
 * Returns list of available backups with file sizes and creation dates.
 */
export function listBackups() {
  try {
    if (!fs.existsSync(backupDir)) return [];

    return fs.readdirSync(backupDir)
      .filter(f => f.startsWith('DTF_BACKUP_') && f.endsWith('.zip'))
      .map(f => {
        try {
          const filePath = path.join(backupDir, f);
          const stat = fs.statSync(filePath);
          return {
            filename: f,
            size: stat.size,
            created_at: stat.mtime
          };
        } catch (err) {
          console.warn(`⚠️ Erreur d'accès aux métadonnées pour ${f}:`, err.message);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (err) {
    console.error('❌ Erreur lors de la récupération des sauvegardes:', err.message);
    return [];
  }
}

/**
 * Restores a backup ZIP archive:
 * - Restores uploaded PDFs to uploads/pdfs (supporting uploads/today/ and legacy pdfs/).
 * - Restores PostgreSQL database if a .sql dump is present.
 */
export async function restoreBackup(zipPath) {
  if (!fs.existsSync(zipPath)) {
    throw new Error('Fichier d\'archive introuvable.');
  }

  const directory = await unzipper.Open.file(zipPath);
  let extractedPdfCount = 0;
  let sqlExecuted = false;

  for (const file of directory.files) {
    const normalizedPath = file.path.replace(/\\/g, '/');

    // 1. Extract PDFs
    if (
      normalizedPath.startsWith('uploads/today/') ||
      normalizedPath.startsWith('uploads/') ||
      normalizedPath.startsWith('pdfs/')
    ) {
      const filename = path.basename(normalizedPath);
      // Skip empty directory markers or placeholder files
      if (filename && !filename.startsWith('.') && !filename.endsWith('.txt')) {
        const dest = path.join(uploadDir, filename);
        await new Promise((resolve, reject) => {
          file.stream()
            .pipe(fs.createWriteStream(dest))
            .on('finish', resolve)
            .on('error', reject);
        });
        extractedPdfCount++;
      }
    }

    // 2. Restore SQL Dump if present
    if (normalizedPath.endsWith('.sql') && (normalizedPath.startsWith('db_dump_') || normalizedPath.includes('dump'))) {
      try {
        const buffer = await file.buffer();
        const sqlContent = buffer.toString('utf8');
        if (sqlContent.trim()) {
          console.log(`🔄 Exécution du dump SQL de restauration : ${normalizedPath}...`);
          await db.query(sqlContent);
          sqlExecuted = true;
          console.log(`✨ Schéma et données PostgreSQL restaurés avec succès.`);
        }
      } catch (sqlErr) {
        console.error(`⚠️ Erreur lors de l'exécution du dump SQL de restauration :`, sqlErr.message);
      }
    }
  }

  console.log(`✅ Restauration achevée : ${extractedPdfCount} PDF(s) restaurés, Script SQL appliqué : ${sqlExecuted}`);
  return { extractedPdfCount, sqlExecuted };
}

export default {
  initBackupScheduler,
  createBackup,
  cleanOldBackups,
  listBackups,
  restoreBackup,
  generateDatabaseDump,
  getDailyUploadFiles
};
