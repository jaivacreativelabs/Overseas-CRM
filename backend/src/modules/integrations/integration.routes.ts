import { Router } from 'express';
import { IntegrationController } from './integration.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin, requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

// Public incoming webhooks endpoint (bypasses auth token check for external provider callbacks)
router.post('/webhooks/incoming/:providerId', IntegrationController.handleIncomingWebhook);

// Protected routes require authentication
router.use(authenticate);

// Catalog & Status
router.get('/', requireStaff, IntegrationController.getCatalog);

// Provider Connections (Admin exclusive)
router.post('/:providerId/connect', requireAdmin, IntegrationController.connectProvider);
router.post('/:providerId/test', requireStaff, IntegrationController.testConnection);
router.post('/:providerId/disconnect', requireAdmin, IntegrationController.disconnectProvider);

// Activity Logs
router.get('/logs', requireStaff, IntegrationController.getLogs);
router.post('/logs/:logId/retry', requireAdmin, IntegrationController.retryLog);

// Automation Workflows
router.get('/workflows', requireStaff, IntegrationController.getWorkflows);
router.post('/workflows', requireAdmin, IntegrationController.createWorkflow);
router.patch('/workflows/:id/toggle', requireAdmin, IntegrationController.toggleWorkflow);
router.delete('/workflows/:id', requireAdmin, IntegrationController.deleteWorkflow);

// CSV Data Exchange
router.post('/csv/import', requireStaff, IntegrationController.importCSV);
router.get('/csv/export', requireStaff, IntegrationController.exportCSV);

// AI Tools
router.post('/ai/generate', requireStaff, IntegrationController.generateAIDraft);
router.get('/ai/summarize/:studentId', requireStaff, IntegrationController.summarizeStudentAI);

export default router;
