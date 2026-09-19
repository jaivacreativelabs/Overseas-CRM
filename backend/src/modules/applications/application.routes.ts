import { Router } from 'express';
import { ApplicationController } from './application.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/lead/:leadId', ApplicationController.getApplications);
router.get('/:id', ApplicationController.getApplicationById);
router.post('/lead/:leadId', requireStaff, ApplicationController.createApplication);
router.put('/:id/status', requireStaff, ApplicationController.updateStatus);

export default router;
