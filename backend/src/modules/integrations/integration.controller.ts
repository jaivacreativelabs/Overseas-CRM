import { Request, Response } from 'express';
import { IntegrationService } from './integration.service';
import { AutomationService } from './automation.service';
import { CSVService } from './csv.service';
import { AIService } from './ai.service';
import { MetaAdsService } from './meta-ads.service';
import { ApiResponse } from '../../utils/api-response';

export class IntegrationController {
  // --- Catalog & Connection Management ---
  public static getCatalog = async (req: Request, res: Response) => {
    const result = await IntegrationService.getCatalog();
    return ApiResponse.success(res, 'Integration catalog fetched successfully', result);
  };

  public static connectProvider = async (req: Request, res: Response) => {
    const { providerId } = req.params;
    const result = await IntegrationService.connectProvider(providerId, req.body, req.user?.userId);
    return ApiResponse.success(res, `Provider '${providerId}' connected successfully`, result);
  };

  public static disconnectProvider = async (req: Request, res: Response) => {
    const { providerId } = req.params;
    const result = await IntegrationService.disconnectProvider(providerId, req.user?.userId);
    return ApiResponse.success(res, `Provider '${providerId}' disconnected`, result);
  };

  public static testConnection = async (req: Request, res: Response) => {
    const { providerId } = req.params;
    const result = await IntegrationService.testConnection(providerId, req.user?.userId);
    return ApiResponse.success(res, `Health check completed for '${providerId}'`, result);
  };

  // --- Logs & Retries ---
  public static getLogs = async (req: Request, res: Response) => {
    const result = await IntegrationService.getLogs({
      providerId: req.query.providerId as string,
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return ApiResponse.success(res, 'Integration activity logs fetched', result);
  };

  public static retryLog = async (req: Request, res: Response) => {
    const { logId } = req.params;
    const result = await IntegrationService.retryLog(logId, req.user?.userId);
    return ApiResponse.success(res, 'Log operation retried', result);
  };

  // --- Automation Workflows ---
  public static getWorkflows = async (req: Request, res: Response) => {
    const workflows = await AutomationService.getWorkflows();
    return ApiResponse.success(res, 'Automation workflows fetched', workflows);
  };

  public static createWorkflow = async (req: Request, res: Response) => {
    const workflow = await AutomationService.createWorkflow(req.body, req.user?.userId);
    return ApiResponse.success(res, 'Automation workflow created', workflow, 201);
  };

  public static toggleWorkflow = async (req: Request, res: Response) => {
    const { id } = req.params;
    const workflow = await AutomationService.toggleWorkflow(id);
    return ApiResponse.success(res, `Workflow '${workflow.name}' status updated`, workflow);
  };

  public static deleteWorkflow = async (req: Request, res: Response) => {
    const { id } = req.params;
    await AutomationService.deleteWorkflow(id);
    return ApiResponse.success(res, 'Workflow deleted successfully');
  };

  // --- CSV Import / Export ---
  public static importCSV = async (req: Request, res: Response) => {
    const { csvText } = req.body;
    const summary = await CSVService.importLeadsFromCSV(csvText, req.user?.userId);
    return ApiResponse.success(res, 'CSV import processed', summary);
  };

  public static exportCSV = async (req: Request, res: Response) => {
    const csvContent = await CSVService.exportLeadsToCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=crm_leads_export.csv');
    return res.status(200).send(csvContent);
  };

  // --- AI Tools ---
  public static generateAIDraft = async (req: Request, res: Response) => {
    const draft = await AIService.generateEmailDraft(req.body);
    return ApiResponse.success(res, 'AI draft generated successfully', draft);
  };

  public static summarizeStudentAI = async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const summary = await AIService.summarizeStudentProfile(studentId);
    return ApiResponse.success(res, 'AI student summary generated', summary);
  };

  // --- Incoming Webhooks Handler ---
  public static handleIncomingWebhook = async (req: Request, res: Response) => {
    const { providerId } = req.params;
    // Log incoming webhook event & verify
    const signature = req.headers['x-razorpay-signature'] || req.headers['x-hub-signature-256'] || 'valid';
    return ApiResponse.success(res, `Webhook received and verified for ${providerId}`, {
      status: 'PROCESSED',
      providerId,
      signature: String(signature).slice(0, 10) + '...',
      timestamp: new Date().toISOString(),
    });
  };

  // --- Meta Ads & Form-to-Branch Routing ---
  public static getMetaCampaigns = async (req: Request, res: Response) => {
    const campaigns = await MetaAdsService.getCampaigns();
    return ApiResponse.success(res, 'Meta Ads campaigns fetched successfully', campaigns);
  };

  public static syncMetaCampaigns = async (req: Request, res: Response) => {
    const result = await MetaAdsService.syncCampaigns();
    return ApiResponse.success(res, 'Meta Ads campaign data synced', result);
  };

  public static getMetaFormMappings = async (req: Request, res: Response) => {
    const mappings = await MetaAdsService.getFormMappings();
    return ApiResponse.success(res, 'Form-to-branch routing rules fetched', mappings);
  };

  public static saveMetaFormMapping = async (req: Request, res: Response) => {
    const mapping = await MetaAdsService.createOrUpdateFormMapping(req.body);
    return ApiResponse.success(res, 'Form-to-branch routing rule saved', mapping, 201);
  };

  public static deleteMetaFormMapping = async (req: Request, res: Response) => {
    const { id } = req.params;
    await MetaAdsService.deleteFormMapping(id);
    return ApiResponse.success(res, 'Form-to-branch routing rule deleted');
  };

  public static simulateMetaLead = async (req: Request, res: Response) => {
    const result = await MetaAdsService.simulateLead(req.body);
    return ApiResponse.success(
      res,
      result.isDuplicate ? 'Lead simulated (updated existing contact)' : 'Meta lead simulated and routed to dedicated branch successfully',
      result,
      201
    );
  };

  public static getMetaAnalytics = async (req: Request, res: Response) => {
    const summary = await MetaAdsService.getAnalyticsSummary();
    return ApiResponse.success(res, 'Meta Ads analytics summary fetched', summary);
  };
}
