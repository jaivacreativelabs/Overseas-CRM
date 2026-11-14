import { Schema, model, Document, Types } from 'mongoose';
import { VisaStatus } from '../../config/constants';

export interface IVisaStatusHistory {
  status: VisaStatus;
  remarks?: string;
  internalRemarks?: string;
  studentInstructions?: string;
  changedById?: Types.ObjectId;
  changedByName?: string;
  changedAt: Date;
}

export interface IVisaRecord extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentCustomId?: string;
  studentName?: string;
  studentEmail?: string;
  applicationId?: string;
  applicationRef?: Types.ObjectId;
  universityName?: string;
  counsellorId?: Types.ObjectId;
  counsellorName?: string;
  country: string;
  visaType: string;
  submissionDate?: Date;
  applicationDate?: Date;
  appointmentDate?: Date;
  vfsCenterLocation?: string;
  status: VisaStatus;
  decision?: 'APPROVED' | 'REJECTED' | null;
  decisionDate?: Date;
  visaNumber?: string;
  validUntil?: Date;
  rejectionReason?: string;
  counsellorRemarks?: string;
  internalRemarks?: string;
  studentInstructions?: string;
  decisionDocumentUrl?: string;
  decisionDocumentName?: string;
  additionalInfoRequired?: string;
  lastNotifiedStatus?: string;
  statusHistory: IVisaStatusHistory[];
  notes?: string;
  updatedById?: Types.ObjectId;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const visaStatusHistorySchema = new Schema<IVisaStatusHistory>(
  {
    status: {
      type: String,
      enum: Object.values(VisaStatus),
      required: true,
    },
    remarks: { type: String, default: '' },
    internalRemarks: { type: String, default: '' },
    studentInstructions: { type: String, default: '' },
    changedById: { type: Schema.Types.ObjectId, ref: 'User' },
    changedByName: { type: String, default: 'Staff' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const visaRecordSchema = new Schema<IVisaRecord>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    studentCustomId: { type: String, trim: true, index: true },
    studentName: { type: String, trim: true, index: true },
    studentEmail: { type: String, trim: true, lowercase: true },
    applicationId: { type: String, trim: true, index: true },
    applicationRef: { type: Schema.Types.ObjectId, ref: 'Application' },
    universityName: { type: String, trim: true },
    counsellorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    counsellorName: { type: String, trim: true },
    country: { type: String, required: true, index: true },
    visaType: { type: String, default: 'Student Visa' },
    submissionDate: { type: Date },
    applicationDate: { type: Date },
    appointmentDate: { type: Date },
    vfsCenterLocation: { type: String },
    status: {
      type: String,
      enum: Object.values(VisaStatus),
      default: VisaStatus.NOT_STARTED,
      index: true,
    },
    decision: {
      type: String,
      enum: ['APPROVED', 'REJECTED', null],
      default: null,
      index: true,
    },
    decisionDate: { type: Date },
    visaNumber: { type: String, trim: true },
    validUntil: { type: Date },
    rejectionReason: { type: String },
    counsellorRemarks: { type: String },
    internalRemarks: { type: String },
    studentInstructions: { type: String },
    decisionDocumentUrl: { type: String },
    decisionDocumentName: { type: String },
    additionalInfoRequired: { type: String },
    lastNotifiedStatus: { type: String },
    statusHistory: { type: [visaStatusHistorySchema], default: [] },
    notes: { type: String },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String },
  },
  {
    timestamps: true,
  }
);

visaRecordSchema.index({ country: 1, status: 1 });
visaRecordSchema.index({ counsellorId: 1, status: 1 });
visaRecordSchema.index({ updatedAt: -1 });

export const VisaRecordModel = model<IVisaRecord>('VisaRecord', visaRecordSchema);
