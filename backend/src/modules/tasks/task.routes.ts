import { Router } from 'express';
import { TaskController } from './task.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, requireStaff);

router.get('/', TaskController.getTasks);
router.post('/', TaskController.createTask);
router.put('/:id/status', TaskController.updateStatus);

export default router;
