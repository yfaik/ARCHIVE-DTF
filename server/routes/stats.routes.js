import { Router } from 'express';
import { getDashboardStats } from '../controllers/stats.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticateToken, getDashboardStats);

export default router;
