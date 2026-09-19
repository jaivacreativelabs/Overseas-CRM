import { Schema, model, Document, Types } from 'mongoose';
import { VisaStatus } from '../../config/constants';

export interface IVisaRecord extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  country: string;
  visaType: string;
  applicationDate?: Date;
  appointmentDate?: Date;
  vfsCenterLocation?: string;
  status: VisaStatus;
  decisionDate?: Date;
  visaNumber?: string;
  validUntil?: Date;
  rejectionReason?: string;
  visaGrantLetterUrl?: string;
  notes?: string;
  updatedById?: Types.ObjectId;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const visaRecordSchema = new Schema<IVisaRecord>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    country: { type: String, required: true },
    visaType: { type: String, default: 'Student Visa' },
    applicationDate: { type: Date },
    appointmentDate: { type: Date },
    vfsCenterLocation: { type: String },
    status: {
      type: String,
      enum: Object.values(VisaStatus),
      default: VisaStatus.PENDING,
      index: true,
    },
    decisionDate: { type: Date },
    visaNumber: { type: String },
    validUntil: { type: Date },
    rejectionReason: { type: String },
    visaGrantLetterUrl: { type: String },
    notes: { type: String },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String },
  },
  {
    timestamps: true,
  }
);

export const VisaRecordModel = model<IVisaRecord>('VisaRecord', visaRecordSchema);
