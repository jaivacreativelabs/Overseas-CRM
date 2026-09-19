import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin, requireStaff } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createUserSchema, updateUserSchema } from './user.validator';

const router = Router();

router.use(authenticate);

// Counsellors list (accessible by staff for assigning leads/tasks)
router.get('/counsellors', requireStaff, UserController.getCounsellors);

// Admin-only user management
router.get('/', requireAdmin, UserController.getUsers);
router.get('/:id', requireAdmin, UserController.getUserById);
router.post('/', requireAdmin, validate(createUserSchema), UserController.createUser);
router.put('/:id', requireAdmin, validate(updateUserSchema), UserController.updateUser);
router.delete('/:id', requireAdmin, UserController.deleteUser);

export default router;
