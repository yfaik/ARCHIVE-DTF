import { Router } from 'express';
import { getAllServices } from '../controllers/service.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getAllServices);

export default router;
