import { createBackup, listBackups, restoreBackup } from '../services/backup.service.js';
import { createAuditLog } from '../middleware/audit.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.join(__dirname, '../backups');

export async function getBackupsList(req, res) {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du chargement des sauvegardes.' });
  }
}

export async function triggerManualBackup(req, res) {
  try {
    const result = await createBackup('Daily');

    await createAuditLog({
      req,
      action: 'CREATION_SAUVEGARDE',
      newValue: { fileName: result.fileName, size: result.size }
    });

    res.json({ message: 'Sauvegarde effectuée avec succès.', backup: result });
  } catch (err) {
    console.error('Erreur manuel backup:', err);
    res.status(500).json({ error: err.message || 'Erreur lors de la création de la sauvegarde.' });
  }
}

export async function downloadBackupZip(req, res) {
  try {
    const { filename } = req.params;
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Nom de fichier invalide.' });
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(backupDir, safeFilename);

    const resolvedPath = path.resolve(filePath);
    const resolvedBackupDir = path.resolve(backupDir);

    if (!resolvedPath.startsWith(resolvedBackupDir)) {
      return res.status(403).json({ error: 'Accès au fichier non autorisé.' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier de sauvegarde introuvable.' });
    }

    res.download(filePath, safeFilename);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du téléchargement de la sauvegarde.' });
  }
}

export async function triggerRestoreBackup(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier archive ZIP de sauvegarde requis.' });
    }

    await restoreBackup(req.file.path);

    await createAuditLog({
      req,
      action: 'RESTAURATION_SAUVEGARDE',
      newValue: { originalName: req.file.originalname }
    });

    fs.unlinkSync(req.file.path);

    res.json({ message: 'Sauvegarde restaurée avec succès.' });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erreur lors de la restauration de la sauvegarde.' });
  }
}
