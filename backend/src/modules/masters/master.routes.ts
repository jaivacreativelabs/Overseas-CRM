import { Router } from 'express';
import { MasterController } from './master.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// Everyone signed in can read master values (dropdowns need them); only admins can add them.
router.get('/', MasterController.getAll);
router.get('/:type', MasterController.getByType);
router.post('/', requireAdmin, MasterController.create);

export default router;
