import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

// All staff can open the audit log; the controller limits non-owners to their own entries.
router.use(authenticate, requireStaff);

router.get('/', AuditController.getLogs);
router.get('/actions', AuditController.getActions);

export default router;
