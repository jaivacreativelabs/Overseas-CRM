import { Schema, model, Document, Types } from 'mongoose';
import { ApplicationStatus } from '../../config/constants';

export interface IApplication extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  universityId: Types.ObjectId;
  universityName: string;
  courseId: Types.ObjectId;
  courseTitle: string;
  country: string;
  intake: string;
  applicationNumber?: string;
  status: ApplicationStatus;
  submissionDate: Date;
  decisionDate?: Date;
  rejectionReason?: string;
  portalUsername?: string;
  portalPassword?: string;
  notes?: string;
  createdById: Types.ObjectId;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    universityName: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    courseTitle: { type: String, required: true },
    country: { type: String, required: true },
    intake: { type: String, required: true },
    applicationNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.SUBMITTED,
      index: true,
    },
    submissionDate: { type: Date, default: Date.now },
    decisionDate: { type: Date },
    rejectionReason: { type: String },
    portalUsername: { type: String },
    portalPassword: { type: String },
    notes: { type: String },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const ApplicationModel = model<IApplication>('Application', applicationSchema);
