import { Router } from 'express';
import { IntegrationController } from './integration.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwnerAdmin } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  connectProviderSchema,
  providerIdSchema,
  saveMetaFormMappingSchema,
  simulateMetaLeadSchema,
  createWorkflowSchema,
  objectIdParamsSchema,
  importCSVSchema,
  generateAIDraftSchema,
} from './integration.validator';

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
router.post('/meta-ads/mappings', validate(saveMetaFormMappingSchema), IntegrationController.saveMetaFormMapping);
router.delete('/meta-ads/mappings/:id', validate(objectIdParamsSchema), IntegrationController.deleteMetaFormMapping);
router.post('/meta-ads/simulate-lead', validate(simulateMetaLeadSchema), IntegrationController.simulateMetaLead);
router.get('/meta-ads/analytics', IntegrationController.getMetaAnalytics);

// Provider Connections
router.post('/:providerId/connect', validate(connectProviderSchema), IntegrationController.connectProvider);
router.post('/:providerId/test', validate(providerIdSchema), IntegrationController.testConnection);
router.post('/:providerId/disconnect', validate(providerIdSchema), IntegrationController.disconnectProvider);

// Activity Logs
router.get('/logs', IntegrationController.getLogs);
router.post('/logs/:logId/retry', validate(objectIdParamsSchema), IntegrationController.retryLog);

// Automation Workflows
router.get('/workflows', IntegrationController.getWorkflows);
router.post('/workflows', validate(createWorkflowSchema), IntegrationController.createWorkflow);
router.patch('/workflows/:id/toggle', validate(objectIdParamsSchema), IntegrationController.toggleWorkflow);
router.delete('/workflows/:id', validate(objectIdParamsSchema), IntegrationController.deleteWorkflow);

// CSV Data Exchange
router.post('/csv/import', validate(importCSVSchema), IntegrationController.importCSV);
router.get('/csv/export', IntegrationController.exportCSV);

// AI Tools
router.post('/ai/generate', validate(generateAIDraftSchema), IntegrationController.generateAIDraft);
router.get('/ai/summarize/:studentId', IntegrationController.summarizeStudentAI);

export default router;
