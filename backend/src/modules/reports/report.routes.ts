import { Router } from 'express';
import { ReportController } from './report.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, requireStaff);

router.get('/dashboard', ReportController.getDashboard);

export default router;
