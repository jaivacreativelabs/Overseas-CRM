import { Router } from 'express';
import { LeadController } from './lead.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin, requireStaff } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createLeadSchema,
  updateLeadSchema,
  recordContactAttemptSchema,
  scheduleCounsellingSchema,
  updateCounsellingAttendanceSchema,
  closeLostSchema,
} from './lead.validator';

const router = Router();

// Public Lead Ingestion & Webhook Endpoints (unauthenticated)
router.post('/capture', LeadController.captureLandingPageLead);
router.get('/webhook/meta', LeadController.verifyMetaWebhook);
router.post('/webhook/meta', LeadController.handleMetaWebhook);

router.get('/:id/download-all-details', authenticate, LeadController.downloadAllDetails);

router.use(authenticate, requireStaff);

router.get('/', LeadController.getLeads);
router.get('/:id', LeadController.getLeadById);
router.post('/', validate(createLeadSchema), LeadController.createLead);
router.put('/:id', validate(updateLeadSchema), LeadController.updateLead);

// Contact Attempts
router.post('/:id/contact-attempts', validate(recordContactAttemptSchema), LeadController.recordContactAttempt);

// Counselling
router.post('/:id/counselling', validate(scheduleCounsellingSchema), LeadController.scheduleCounselling);
router.put('/:id/counselling/:sessionId/attendance', validate(updateCounsellingAttendanceSchema), LeadController.updateCounsellingAttendance);

// Stage transitions
router.post('/:id/convert-interested', LeadController.convertToInterested);
router.post('/:id/closed-lost', validate(closeLostSchema), LeadController.markClosedLost);
router.post('/:id/reopen', LeadController.reopenClosedLost);

// Admin-only actions
router.post('/:id/archive', requireAdmin, LeadController.archiveLead);
router.delete('/:id', requireAdmin, LeadController.deleteLead);

export default router;
