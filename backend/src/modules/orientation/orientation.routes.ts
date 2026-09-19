import { Router } from 'express';
import { OrientationController } from './orientation.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', OrientationController.getOrientations);
router.post('/', requireStaff, OrientationController.createOrientation);
router.put('/:id/attendance', requireStaff, OrientationController.markAttendance);

export default router;
