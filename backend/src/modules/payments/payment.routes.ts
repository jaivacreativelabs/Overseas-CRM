import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';
import { upload } from '../../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

router.get('/lead/:leadId', PaymentController.getPayments);
router.post('/lead/:leadId/request', requireStaff, PaymentController.createRequest);
router.post('/:id/submit-proof', upload.single('file'), PaymentController.submitProof);
router.put('/:id/verify', requireStaff, PaymentController.verifyPayment);

export default router;
