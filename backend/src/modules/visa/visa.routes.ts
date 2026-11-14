import { Router } from 'express';
import { VisaController } from './visa.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';
import { upload } from '../../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

// Staff List for Reports -> Visa Tracking tab
router.get('/', requireStaff, VisaController.getVisaList);

// Document upload for Visa Decisions & Grants
router.post('/upload-document', requireStaff, upload.single('file'), VisaController.uploadDocument);

// Get single visa record by ID
router.get('/:id', VisaController.getVisaById);

// Update visa status with history & remarks
router.put('/:id/status', requireStaff, VisaController.updateVisaStatus);

// Record official approval / rejection decision
router.put('/:id/decision', requireStaff, VisaController.recordDecision);

// Lead-specific routes (Used by Student Portal & Lead Detail Page)
router.get('/lead/:leadId', VisaController.getVisaForLead);
router.put('/lead/:leadId', requireStaff, VisaController.updateVisa);

export default router;
