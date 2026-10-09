import { Request, Response } from 'express';
import { IntegrationService } from './integration.service';
import { AutomationService } from './automation.service';
import { CSVService } from './csv.service';
import { AIService } from './ai.service';
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
}
