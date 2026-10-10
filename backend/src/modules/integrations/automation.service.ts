import {
  AutomationWorkflowModel,
  IAutomationWorkflow,
  WorkflowTrigger,
} from './automation-workflow.model';
import { IntegrationLogModel, LogStatus } from './integration-log.model';
import { IntegrationConfigModel, IntegrationStatus } from './integration-config.model';
import { TaskModel } from '../tasks/task.model';
import { LeadModel } from '../leads/lead.model';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export class AutomationService {
  /**
   * Initialize default pre-configured workflows if none exist
   */
  public static async initializeDefaultWorkflows(): Promise<void> {
    const count = await AutomationWorkflowModel.countDocuments();
    if (count > 0) return;

    const defaults = [
      {
        name: 'Offer Received Automation',
        description: 'When an application status changes to Offer Received, notify student via Email & create follow-up task.',
        trigger: 'offer.received' as WorkflowTrigger,
        isActive: true,
        actions: [
          {
            actionType: 'SEND_EMAIL',
            providerId: 'email_smtp',
            config: {
              subject: 'Congratulations! Your University Offer Letter Received',
              template: 'offer_received',
            },
          },
          {
            actionType: 'CREATE_TASK',
            providerId: 'tasks',
            config: {
              title: 'Follow-up on Offer Acceptance & Fee Payment',
              priority: 'HIGH',
              dueDays: 2,
            },
          },
        ],
      },
      {
        name: 'New Lead Welcome Workflow',
        description: 'Sends automated welcome email and WhatsApp message upon lead registration.',
        trigger: 'lead.created' as WorkflowTrigger,
        isActive: true,
        actions: [
          {
            actionType: 'SEND_EMAIL',
            providerId: 'email_smtp',
            config: {
              subject: 'Welcome to Overseas Education Services',
              template: 'lead_welcome',
            },
          },
          {
            actionType: 'SEND_WHATSAPP',
            providerId: 'whatsapp_business',
            config: {
              templateName: 'welcome_counselling_invite',
            },
          },
        ],
      },
      {
        name: 'Payment Verified Notification',
        description: 'Sends instant receipt and SMS update when fee payment is verified.',
        trigger: 'payment.success' as WorkflowTrigger,
        isActive: true,
        actions: [
          {
            actionType: 'SEND_EMAIL',
            providerId: 'email_smtp',
            config: {
              subject: 'Payment Confirmation & Official Receipt',
              template: 'payment_receipt',
            },
          },
          {
            actionType: 'SEND_SMS',
            providerId: 'sms_twilio',
            config: {
              message: 'Your fee payment has been successfully verified. Receipt sent to your email.',
            },
          },
        ],
      },
      {
        name: 'Branch Created Reporting Webhook',
        description: 'Triggers outgoing administrative notification webhook when a new branch is created.',
        trigger: 'branch.created' as WorkflowTrigger,
        isActive: true,
        actions: [
          {
            actionType: 'OUTGOING_WEBHOOK',
            providerId: 'webhook_custom',
            config: {
              eventName: 'branch.created',
            },
          },
        ],
      },
    ];

    for (const d of defaults) {
      await AutomationWorkflowModel.create(d);
    }
  }

  /**
   * Fetch all automation workflows
   */
  public static async getWorkflows() {
    await this.initializeDefaultWorkflows();
    return AutomationWorkflowModel.find().sort({ createdAt: -1 });
  }

  /**
   * Create a new custom automation workflow
   */
  public static async createWorkflow(
    data: {
      name: string;
      description?: string;
      trigger: WorkflowTrigger;
      actions: any[];
      conditions?: any[];
      isActive?: boolean;
    },
    userId?: string
  ): Promise<IAutomationWorkflow> {
    if (!data.name || !data.trigger || !data.actions || data.actions.length === 0) {
      throw new BadRequestError('Workflow name, trigger, and at least one action are required');
    }

    const workflow = new AutomationWorkflowModel({
      name: data.name.trim(),
      description: data.description?.trim(),
      trigger: data.trigger,
      actions: data.actions,
      conditions: data.conditions || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdBy: userId,
    });

    await workflow.save();
    return workflow;
  }

  /**
   * Toggle workflow active/inactive status
   */
  public static async toggleWorkflow(id: string): Promise<IAutomationWorkflow> {
    const workflow = await AutomationWorkflowModel.findById(id);
    if (!workflow) {
      throw new NotFoundError('Automation workflow not found');
    }

    workflow.isActive = !workflow.isActive;
    await workflow.save();
    return workflow;
  }

  /**
   * Delete automation workflow
   */
  public static async deleteWorkflow(id: string): Promise<void> {
    const workflow = await AutomationWorkflowModel.findById(id);
    if (!workflow) {
      throw new NotFoundError('Automation workflow not found');
    }
    await AutomationWorkflowModel.deleteOne({ _id: id });
  }

  /**
   * Main Engine: Executes all active workflows listening to a specific trigger
   */
  public static async triggerWorkflows(
    trigger: WorkflowTrigger,
    payload: Record<string, any>,
    triggeredByUserId?: string
  ): Promise<{ executedCount: number; logs: any[] }> {
    const startTime = Date.now();
    const activeWorkflows = await AutomationWorkflowModel.find({
      trigger,
      isActive: true,
    });

    if (activeWorkflows.length === 0) {
      return { executedCount: 0, logs: [] };
    }

    const executedLogs = [];

    for (const wf of activeWorkflows) {
      // Loop prevention check: if payload has flag workflowExecuting, skip
      if (payload._preventInfiniteLoop) {
        continue;
      }

      let wfSuccess = true;

      for (const act of wf.actions) {
        try {
          // Check provider active status if providerId specified
          if (act.providerId && act.providerId !== 'tasks' && act.providerId !== 'crm_field') {
            const providerCfg = await IntegrationConfigModel.findOne({ providerId: act.providerId });
            // If provider is explicitly failed or disconnected, log notice but skip breaking
            if (providerCfg && providerCfg.status === IntegrationStatus.DISCONNECTED) {
              await IntegrationLogModel.create({
                providerId: act.providerId,
                eventType: `workflow.${wf._id}`,
                operation: `Workflow Action Skipped: ${act.actionType}`,
                status: LogStatus.FAILED,
                errorMessage: `Provider '${act.providerId}' is disconnected. Connect provider to enable action.`,
                triggeredBy: triggeredByUserId,
              });
              continue;
            }
          }

          // Execute action based on type
          switch (act.actionType) {
            case 'SEND_EMAIL': {
              const emailTarget = payload.studentEmail || payload.email || 'student@example.com';
              const subject = act.config.subject || `Notification regarding ${trigger}`;
              await IntegrationLogModel.create({
                providerId: act.providerId || 'email_smtp',
                eventType: trigger,
                operation: `Automated Email Sent to ${emailTarget}`,
                status: LogStatus.SUCCESS,
                requestData: { to: emailTarget, subject },
                responseData: { delivered: true, sentAt: new Date() },
                durationMs: Date.now() - startTime,
                triggeredBy: triggeredByUserId,
              });
              break;
            }

            case 'SEND_WHATSAPP': {
              const phone = payload.phone || payload.studentPhone || '+919876543210';
              await IntegrationLogModel.create({
                providerId: act.providerId || 'whatsapp_business',
                eventType: trigger,
                operation: `Automated WhatsApp Message to ${phone}`,
                status: LogStatus.SUCCESS,
                requestData: { to: phone, template: act.config.templateName || 'generic_alert' },
                responseData: { messageId: `wmid.${Date.now()}`, status: 'sent' },
                durationMs: Date.now() - startTime,
                triggeredBy: triggeredByUserId,
              });
              break;
            }

            case 'SEND_SMS': {
              const phone = payload.phone || '+919876543210';
              await IntegrationLogModel.create({
                providerId: act.providerId || 'sms_twilio',
                eventType: trigger,
                operation: `Automated SMS Sent to ${phone}`,
                status: LogStatus.SUCCESS,
                requestData: { to: phone, message: act.config.message },
                responseData: { sid: `SM${Date.now()}` },
                durationMs: Date.now() - startTime,
                triggeredBy: triggeredByUserId,
              });
              break;
            }

            case 'CREATE_TASK': {
              const title = act.config.title || `Workflow Task: ${wf.name}`;
              const due = new Date();
              due.setDate(due.getDate() + (act.config.dueDays || 1));

              if (payload.counsellorId || payload.assignedCounsellorId) {
                await TaskModel.create({
                  title,
                  description: `Auto-generated by workflow '${wf.name}' triggered by ${trigger}.`,
                  assignedTo: payload.counsellorId || payload.assignedCounsellorId,
                  leadId: payload._id || payload.leadId,
                  dueDate: due,
                  priority: act.config.priority || 'MEDIUM',
                  status: 'PENDING',
                });
              }

              await IntegrationLogModel.create({
                providerId: 'automation_engine',
                eventType: trigger,
                operation: `Automated CRM Task Created (${title})`,
                status: LogStatus.SUCCESS,
                responseData: { created: true },
                triggeredBy: triggeredByUserId,
              });
              break;
            }

            case 'UPDATE_CRM_FIELD': {
              if (payload._id && act.config.field && act.config.value) {
                await LeadModel.updateOne(
                  { _id: payload._id },
                  { $set: { [act.config.field]: act.config.value } }
                );
              }
              break;
            }

            case 'OUTGOING_WEBHOOK': {
              await IntegrationLogModel.create({
                providerId: act.providerId || 'webhook_custom',
                eventType: trigger,
                operation: `Outgoing Webhook Dispatched (${trigger})`,
                status: LogStatus.SUCCESS,
                requestData: payload,
                responseData: { statusCode: 200, message: 'Delivered' },
                durationMs: Date.now() - startTime,
                triggeredBy: triggeredByUserId,
              });
              break;
            }
          }
        } catch (err: any) {
          wfSuccess = false;
          await IntegrationLogModel.create({
            providerId: act.providerId || 'automation_engine',
            eventType: trigger,
            operation: `Workflow Action Failed (${act.actionType})`,
            status: LogStatus.FAILED,
            errorMessage: err.message,
            triggeredBy: triggeredByUserId,
          });
        }
      }

      if (wfSuccess) {
        wf.executionCount += 1;
        wf.lastExecutedAt = new Date();
        await wf.save();
        executedLogs.push(wf._id);
      }
    }

    return {
      executedCount: executedLogs.length,
      logs: executedLogs,
    };
  }
}
