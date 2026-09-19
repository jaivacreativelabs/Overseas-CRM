import { Router } from 'express';
import { VisaController } from './visa.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/lead/:leadId', VisaController.getVisa);
router.put('/lead/:leadId', requireStaff, VisaController.updateVisa);

export default router;
