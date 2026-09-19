import { Schema, model, Document, Types } from 'mongoose';
import { OfferStatus } from '../../config/constants';

export interface IOffer extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  applicationId: Types.ObjectId;
  universityName: string;
  courseTitle: string;
  offerType: 'CONDITIONAL' | 'UNCONDITIONAL';
  conditions?: string;
  tuitionFee: number;
  depositAmount: number;
  currency: string;
  deadlineDate?: Date;
  status: OfferStatus;
  originalOfferUrl: string;
  originalOfferFileName: string;
  signedOfferUrl?: string;
  signedOfferFileName?: string;
  signedUploadedAt?: Date;
  reviewedById?: Types.ObjectId;
  reviewedByName?: string;
  reviewedAt?: Date;
  uploadedById: Types.ObjectId;
  uploadedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    universityName: { type: String, required: true },
    courseTitle: { type: String, required: true },
    offerType: { type: String, enum: ['CONDITIONAL', 'UNCONDITIONAL'], default: 'CONDITIONAL' },
    conditions: { type: String },
    tuitionFee: { type: Number, required: true },
    depositAmount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    deadlineDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(OfferStatus),
      default: OfferStatus.ISSUED,
      index: true,
    },
    originalOfferUrl: { type: String, required: true },
    originalOfferFileName: { type: String, required: true },
    signedOfferUrl: { type: String },
    signedOfferFileName: { type: String },
    signedUploadedAt: { type: Date },
    reviewedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedByName: { type: String },
    reviewedAt: { type: Date },
    uploadedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedByName: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const OfferModel = model<IOffer>('Offer', offerSchema);
