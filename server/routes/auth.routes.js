import { Router } from 'express';
import { login, logout, getMe } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateBody, loginSchema } from '../middleware/validate.js';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

export default router;
