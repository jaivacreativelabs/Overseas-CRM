import { Schema, model, Document, Types } from 'mongoose';

export interface ICounsellingSession extends Document {
  leadId: Types.ObjectId;
  counsellorId: Types.ObjectId;
  counsellorName: string;
  scheduledDate: string;
  scheduledTime: string;
  googleMeetLink?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'NO_SHOW';
  attendance: 'PENDING' | 'ATTENDED' | 'ABSENT';
  discussionSummary?: string;
  recommendedCountries?: string[];
  nextSteps?: string;
  createdAt: Date;
  updatedAt: Date;
}

const counsellingSessionSchema = new Schema<ICounsellingSession>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    counsellorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    counsellorName: { type: String, required: true },
    scheduledDate: { type: String, required: true },
    scheduledTime: { type: String, required: true },
    googleMeetLink: { type: String },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW'],
      default: 'SCHEDULED',
      index: true,
    },
    attendance: {
      type: String,
      enum: ['PENDING', 'ATTENDED', 'ABSENT'],
      default: 'PENDING',
    },
    discussionSummary: { type: String },
    recommendedCountries: [{ type: String }],
    nextSteps: { type: String },
  },
  {
    timestamps: true,
  }
);

export const CounsellingSessionModel = model<ICounsellingSession>('CounsellingSession', counsellingSessionSchema);
