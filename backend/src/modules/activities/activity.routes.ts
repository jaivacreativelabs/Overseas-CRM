import { Router } from 'express';
import { ActivityController } from './activity.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/:entityId', ActivityController.getActivities);

export default router;
