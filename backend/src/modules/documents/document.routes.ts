import { Router } from 'express';
import { DocumentController } from './document.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';
import { upload } from '../../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

router.get('/lead/:leadId', DocumentController.getDocuments);
router.post('/lead/:leadId/request', requireStaff, DocumentController.requestDocument);
router.post('/:id/upload', upload.single('file'), DocumentController.uploadDocument);
router.put('/:id/review', requireStaff, DocumentController.reviewDocument);

export default router;
