import { Schema, model, Document, Types } from 'mongoose';
import { PaymentStatus } from '../../config/constants';

export interface IPayment extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  offerId?: Types.ObjectId;
  title: string;
  purpose: 'TUITION_DEPOSIT' | 'APPLICATION_FEE' | 'VISA_FEE' | 'INSURANCE' | 'OTHER';
  amount: number;
  currency: string;
  bankDetails?: string;
  dueDate?: Date;
  status: PaymentStatus;
  transactionReference?: string;
  paymentMode?: string;
  paidDate?: Date;
  proofUrl?: string;
  proofFileName?: string;
  proofSubmittedAt?: Date;
  verifiedById?: Types.ObjectId;
  verifiedByName?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
  requestedById: Types.ObjectId;
  requestedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer' },
    title: { type: String, required: true, trim: true },
    purpose: {
      type: String,
      enum: ['TUITION_DEPOSIT', 'APPLICATION_FEE', 'VISA_FEE', 'INSURANCE', 'OTHER'],
      default: 'TUITION_DEPOSIT',
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    bankDetails: { type: String },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.REQUESTED,
      index: true,
    },
    transactionReference: { type: String, trim: true },
    paymentMode: { type: String },
    paidDate: { type: Date },
    proofUrl: { type: String },
    proofFileName: { type: String },
    proofSubmittedAt: { type: Date },
    verifiedById: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedByName: { type: String },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByName: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const PaymentModel = model<IPayment>('Payment', paymentSchema);
