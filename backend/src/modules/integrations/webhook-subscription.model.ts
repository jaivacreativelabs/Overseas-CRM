import { Schema, model, Document } from 'mongoose';

export interface IWebhookSubscription extends Document {
  name: string;
  targetUrl: string;
  secretKey: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSubscriptionSchema = new Schema<IWebhookSubscription>(
  {
    name: { type: String, required: true, trim: true },
    targetUrl: { type: String, required: true, trim: true },
    secretKey: { type: String, required: true },
    events: [{ type: String, required: true }],
    isActive: { type: Boolean, default: true, index: true },
    failureCount: { type: Number, default: 0 },
    lastTriggeredAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const WebhookSubscriptionModel = model<IWebhookSubscription>(
  'WebhookSubscription',
  webhookSubscriptionSchema
);
