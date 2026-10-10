import { Schema, model, Document, Types } from 'mongoose';

export type WorkflowTrigger =
  | 'lead.created'
  | 'student.created'
  | 'document.uploaded'
  | 'application.submitted'
  | 'offer.received'
  | 'payment.success'
  | 'counselling.approaching'
  | 'branch.created';

export type WorkflowActionType =
  | 'SEND_EMAIL'
  | 'SEND_WHATSAPP'
  | 'SEND_SMS'
  | 'CREATE_TASK'
  | 'UPDATE_CRM_FIELD'
  | 'OUTGOING_WEBHOOK';

export interface IWorkflowAction {
  actionType: WorkflowActionType;
  providerId?: string;
  config: Record<string, any>;
}

export interface IAutomationWorkflow extends Document {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  isActive: boolean;
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than';
    value: string;
  }>;
  actions: IWorkflowAction[];
  executionCount: number;
  lastExecutedAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const automationWorkflowSchema = new Schema<IAutomationWorkflow>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    trigger: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    conditions: [
      {
        field: { type: String, required: true },
        operator: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    actions: [
      {
        actionType: { type: String, required: true },
        providerId: { type: String },
        config: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    executionCount: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: { type: Date },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const AutomationWorkflowModel = model<IAutomationWorkflow>(
  'AutomationWorkflow',
  automationWorkflowSchema
);
