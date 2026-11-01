import { Router } from 'express';
import { getBackupsList, triggerManualBackup, downloadBackupZip, triggerRestoreBackup } from '../controllers/backup.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel serverless (/var/task is read-only), use /tmp/temp_restore
const tempRestoreDir = process.env.VERCEL
  ? path.join('/tmp', 'temp_restore')
  : path.join(__dirname, '../temp_restore');

// Guard top-level mkdir: NEVER run top-level mkdir on serverless import
if (!process.env.VERCEL) {
  try {
    if (!fs.existsSync(tempRestoreDir)) {
      fs.mkdirSync(tempRestoreDir, { recursive: true });
    }
  } catch (e) {
    console.warn("Skipping local directory creation:", e.message);
  }
}

// Multer storage with lazy on-demand directory creation inside destination
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      if (!fs.existsSync(tempRestoreDir)) {
        fs.mkdirSync(tempRestoreDir, { recursive: true });
      }
    } catch (e) {
      console.warn("Skipping local directory creation:", e.message);
    }
    cb(null, tempRestoreDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `restore_${uniqueSuffix}.zip`);
  }
});

const uploadZip = multer({ storage });

const router = Router();

// Chef de Division only
router.use(authenticateToken, authorizeRoles('CHEF_DIVISION'));

router.get('/', getBackupsList);
router.post('/create', triggerManualBackup);
router.get('/download/:filename', downloadBackupZip);
router.post('/restore', uploadZip.single('backupZip'), triggerRestoreBackup);

export default router;
