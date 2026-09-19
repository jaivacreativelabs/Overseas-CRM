import { Router } from 'express';
import { MessageController } from './message.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/lead/:leadId', MessageController.getMessages);
router.post('/', MessageController.sendMessage);
router.put('/internal-note/:id', requireStaff, MessageController.editInternalNote);

export default router;
