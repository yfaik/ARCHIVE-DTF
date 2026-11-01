import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Only Chef de Division can access Audit Logs history
router.get('/', authenticateToken, authorizeRoles('CHEF_DIVISION'), getAuditLogs);

export default router;
