import { Router } from 'express';
import { ProfileEvaluationController } from './profile.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// Staff and Student can view
router.get('/:leadId', ProfileEvaluationController.getProfile);

// Staff can update
router.put('/:leadId', requireStaff, ProfileEvaluationController.updateProfile);

export default router;
