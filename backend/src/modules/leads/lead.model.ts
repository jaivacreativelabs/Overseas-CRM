import { Schema, model, Document, Types } from 'mongoose';
import { LeadSource, LeadStatus, StudentStage } from '../../config/constants';

export interface ILead extends Document {
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  passportNumber?: string;
  targetCountry?: string;
  targetCourse?: string;
  targetIntake?: string;
  budget?: string;
  source: LeadSource;
  status: LeadStatus;
  stage: StudentStage;
  counsellorId?: Types.ObjectId;
  studentUserId?: Types.ObjectId;
  closedLostReason?: string;
  previousStatus?: LeadStatus;
  previousStage?: StudentStage;
  isArchived: boolean;
  notes?: string;
  lastContactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    passportNumber: { type: String, trim: true },
    targetCountry: { type: String, trim: true, index: true },
    targetCourse: { type: String, trim: true },
    targetIntake: { type: String, trim: true },
    budget: { type: String, trim: true },
    source: { type: String, enum: Object.values(LeadSource), default: LeadSource.WEBSITE, index: true },
    status: { type: String, enum: Object.values(LeadStatus), default: LeadStatus.NEW, index: true },
    stage: { type: String, enum: Object.values(StudentStage), default: StudentStage.LEAD_CAPTURED, index: true },
    counsellorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    closedLostReason: { type: String },
    previousStatus: { type: String, enum: Object.values(LeadStatus) },
    previousStage: { type: String, enum: Object.values(StudentStage) },
    isArchived: { type: Boolean, default: false, index: true },
    notes: { type: String },
    lastContactedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ createdAt: -1 });

export const LeadModel = model<ILead>('Lead', leadSchema);
