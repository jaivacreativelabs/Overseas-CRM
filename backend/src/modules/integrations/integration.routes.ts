import { Router } from 'express';
import { IntegrationController } from './integration.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwnerAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// Public incoming webhooks endpoint (bypasses auth token check for external provider callbacks)
router.post('/webhooks/incoming/:providerId', IntegrationController.handleIncomingWebhook);

// Protected routes require authentication & strict Owner Admin authorization
router.use(authenticate);
router.use(requireOwnerAdmin);

// Catalog & Status
router.get('/', IntegrationController.getCatalog);

// Meta Ads & Form-to-Branch Routing
router.get('/meta-ads/campaigns', IntegrationController.getMetaCampaigns);
router.post('/meta-ads/campaigns/sync', IntegrationController.syncMetaCampaigns);
router.get('/meta-ads/mappings', IntegrationController.getMetaFormMappings);
router.post('/meta-ads/mappings', IntegrationController.saveMetaFormMapping);
router.delete('/meta-ads/mappings/:id', IntegrationController.deleteMetaFormMapping);
router.post('/meta-ads/simulate-lead', IntegrationController.simulateMetaLead);
router.get('/meta-ads/analytics', IntegrationController.getMetaAnalytics);

// Provider Connections
router.post('/:providerId/connect', IntegrationController.connectProvider);
router.post('/:providerId/test', IntegrationController.testConnection);
router.post('/:providerId/disconnect', IntegrationController.disconnectProvider);

// Activity Logs
router.get('/logs', IntegrationController.getLogs);
router.post('/logs/:logId/retry', IntegrationController.retryLog);

// Automation Workflows
router.get('/workflows', IntegrationController.getWorkflows);
router.post('/workflows', IntegrationController.createWorkflow);
router.patch('/workflows/:id/toggle', IntegrationController.toggleWorkflow);
router.delete('/workflows/:id', IntegrationController.deleteWorkflow);

// CSV Data Exchange
router.post('/csv/import', IntegrationController.importCSV);
router.get('/csv/export', IntegrationController.exportCSV);

// AI Tools
router.post('/ai/generate', IntegrationController.generateAIDraft);
router.get('/ai/summarize/:studentId', IntegrationController.summarizeStudentAI);

export default router;
