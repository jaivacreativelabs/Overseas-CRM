import { Schema, model, Document, Types } from 'mongoose';
import { DocumentStatus } from '../../config/constants';

export interface IDocument extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  title: string;
  category: 'ACADEMIC' | 'IDENTITY' | 'FINANCIAL' | 'LANGUAGE_TEST' | 'EXPERIENCE' | 'OTHER';
  description?: string;
  isMandatory: boolean;
  status: DocumentStatus;
  fileUrl?: string;
  originalFileName?: string;
  fileSize?: number;
  mimeType?: string;
  rejectionReason?: string;
  uploadedAt?: Date;
  reviewedAt?: Date;
  reviewedById?: Types.ObjectId;
  reviewedByName?: string;
  requestedById: Types.ObjectId;
  requestedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      enum: ['ACADEMIC', 'IDENTITY', 'FINANCIAL', 'LANGUAGE_TEST', 'EXPERIENCE', 'OTHER'],
      default: 'ACADEMIC',
    },
    description: { type: String },
    isMandatory: { type: Boolean, default: true },
    status: {
      type: String,
      enum: Object.values(DocumentStatus),
      default: DocumentStatus.REQUESTED,
      index: true,
    },
    fileUrl: { type: String },
    originalFileName: { type: String },
    fileSize: { type: Number },
    mimeType: { type: String },
    rejectionReason: { type: String },
    uploadedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedByName: { type: String },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByName: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const DocumentModel = model<IDocument>('Document', documentSchema);
