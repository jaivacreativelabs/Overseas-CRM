import { Schema, model, Document, Types } from 'mongoose';

export interface IContactAttempt extends Document {
  leadId: Types.ObjectId;
  attemptDate: Date;
  method: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON';
  outcome: 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'SWITCHED_OFF' | 'CALLBACK_REQUESTED' | 'INVALID_NUMBER' | 'WRONG_NUMBER';
  notes?: string;
  callbackDate?: string;
  callbackTime?: string;
  recordedById: Types.ObjectId;
  recordedByName: string;
  createdAt: Date;
}

const contactAttemptSchema = new Schema<IContactAttempt>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    attemptDate: { type: Date, default: Date.now, required: true },
    method: {
      type: String,
      enum: ['PHONE', 'WHATSAPP', 'EMAIL', 'IN_PERSON'],
      required: true,
    },
    outcome: {
      type: String,
      enum: ['CONNECTED', 'NO_ANSWER', 'BUSY', 'SWITCHED_OFF', 'CALLBACK_REQUESTED', 'INVALID_NUMBER', 'WRONG_NUMBER'],
      required: true,
    },
    notes: { type: String },
    callbackDate: { type: String },
    callbackTime: { type: String },
    recordedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recordedByName: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable record
  }
);

contactAttemptSchema.index({ leadId: 1, createdAt: -1 });

export const ContactAttemptModel = model<IContactAttempt>('ContactAttempt', contactAttemptSchema);
