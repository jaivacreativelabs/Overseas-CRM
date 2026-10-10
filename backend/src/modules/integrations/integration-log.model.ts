import { Schema, model, Document, Types } from 'mongoose';

export enum LogStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  RETRYING = 'RETRYING',
}

export interface IIntegrationLog extends Document {
  providerId: string;
  eventType: string; // e.g. 'email.welcome', 'whatsapp.reminder', 'razorpay.webhook', 'automation.execute'
  operation: string; // e.g. 'Send Email', 'Create Event', 'Webhook Trigger'
  status: LogStatus;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  durationMs?: number;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  triggeredBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const integrationLogSchema = new Schema<IIntegrationLog>(
  {
    providerId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    operation: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(LogStatus),
      default: LogStatus.PENDING,
      index: true,
    },
    requestData: {
      type: Schema.Types.Mixed,
    },
    responseData: {
      type: Schema.Types.Mixed,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

integrationLogSchema.index({ createdAt: -1 });

export const IntegrationLogModel = model<IIntegrationLog>('IntegrationLog', integrationLogSchema);
