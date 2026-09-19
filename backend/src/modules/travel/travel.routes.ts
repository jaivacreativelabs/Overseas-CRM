import { Router } from 'express';
import { TravelController } from './travel.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/lead/:leadId', TravelController.getTravel);
router.put('/lead/:leadId', requireStaff, TravelController.updateDetails);
router.post('/lead/:leadId/departure', requireStaff, TravelController.recordDeparture);
router.post('/lead/:leadId/arrival', requireStaff, TravelController.recordArrival);

export default router;
