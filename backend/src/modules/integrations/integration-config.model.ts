import { Schema, model, Document } from 'mongoose';

export enum IntegrationCategory {
  COMMUNICATION = 'COMMUNICATION',
  STUDENT_JOURNEY = 'STUDENT_JOURNEY',
  PAYMENTS_DATA = 'PAYMENTS_DATA',
  AUTOMATION_INTELLIGENCE = 'AUTOMATION_INTELLIGENCE',
}

export enum IntegrationStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  FAILED = 'FAILED',
  CONFIGURED = 'CONFIGURED',
}

export interface IIntegrationConfig extends Document {
  providerId: string; // e.g. 'email_smtp', 'whatsapp_business', 'sms_twilio', 'google_calendar', 'university_api', 'document_s3', 'payment_razorpay', 'csv_import', 'ai_openai', 'webhook_custom'
  category: IntegrationCategory;
  name: string;
  description: string;
  icon: string;
  status: IntegrationStatus;
  credentials: Record<string, any>; // Sensitive credentials stored securely on server
  settings: Record<string, any>; // Provider options, default templates, enabled events
  lastActivityAt?: Date;
  lastSuccessAt?: Date;
  lastErrorAt?: Date;
  lastErrorMessage?: string;
  isSystemEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const integrationConfigSchema = new Schema<IIntegrationConfig>(
  {
    providerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(IntegrationCategory),
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(IntegrationStatus),
      default: IntegrationStatus.DISCONNECTED,
      index: true,
    },
    credentials: {
      type: Schema.Types.Mixed,
      default: {},
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastActivityAt: { type: Date },
    lastSuccessAt: { type: Date },
    lastErrorAt: { type: Date },
    lastErrorMessage: { type: String },
    isSystemEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const IntegrationConfigModel = model<IIntegrationConfig>('IntegrationConfig', integrationConfigSchema);
