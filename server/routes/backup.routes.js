import { Router } from 'express';
import { getBackupsList, triggerManualBackup, downloadBackupZip, triggerRestoreBackup } from '../controllers/backup.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadZip = multer({ dest: path.join(__dirname, '../temp_restore') });

const router = Router();

// Chef de Division only
router.use(authenticateToken, authorizeRoles('CHEF_DIVISION'));

router.get('/', getBackupsList);
router.post('/create', triggerManualBackup);
router.get('/download/:filename', downloadBackupZip);
router.post('/restore', uploadZip.single('backupZip'), triggerRestoreBackup);

export default router;
