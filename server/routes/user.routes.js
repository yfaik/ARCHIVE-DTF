import { Router } from 'express';
import { getAllUsers, createUser, updateUser, toggleUserStatus, resetPassword, deleteUser } from '../controllers/user.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateBody, userCreateSchema, userUpdateSchema, resetPasswordSchema } from '../middleware/validate.js';

const router = Router();

// Chef de Division only permissions
router.use(authenticateToken, authorizeRoles('CHEF_DIVISION'));

router.get('/', getAllUsers);
router.post('/', validateBody(userCreateSchema), createUser);
router.put('/:id', validateBody(userUpdateSchema), updateUser);
router.patch('/:id/status', toggleUserStatus);
router.post('/:id/reset-password', validateBody(resetPasswordSchema), resetPassword);
router.delete('/:id', deleteUser);

export default router;
