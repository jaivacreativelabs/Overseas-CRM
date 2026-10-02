import { Router } from 'express';
import { OfferController } from './offer.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin, requireStaff, requireStudent } from '../../middleware/rbac.middleware';
import { upload } from '../../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requireStaff, OfferController.getAllOffers);
router.get('/lead/:leadId', OfferController.getOffers);
router.post('/lead/:leadId/original', requireAdmin, upload.single('file'), OfferController.uploadOriginal);
router.post('/:id/signed', requireStudent, upload.single('file'), OfferController.uploadSigned);
router.put('/:id/review', requireStaff, OfferController.reviewSigned);

export default router;
