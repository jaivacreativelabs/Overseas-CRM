import { Router } from 'express';
import { MasterController } from './master.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', MasterController.getAll);
router.get('/:type', MasterController.getByType);
router.post('/', requireStaff, MasterController.create);

export default router;
