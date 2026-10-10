import { Schema, model, Document, Types } from 'mongoose';
import {
  COUNSELLING_FEE_DEFAULT_CURRENCY,
  COUNSELLING_FEE_TYPES,
  CounsellingFeeType,
} from './counselling-fee.constants';

export interface ICounsellingFeePayment {
  amount: number;
  paidOn?: Date;
  mode?: string;
  reference?: string;
  note?: string;
  recordedById?: Types.ObjectId;
  recordedByName?: string;
  createdAt?: Date;
}

export interface ICounsellingFee extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  feeType?: CounsellingFeeType;
  description?: string;
  totalFee: number;
  currency: string;
  notes?: string;
  setById?: Types.ObjectId;
  setByName?: string;
  setAt?: Date;
  payments: ICounsellingFeePayment[];
  createdAt: Date;
  updatedAt: Date;
}

const counsellingFeePaymentSchema = new Schema<ICounsellingFeePayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    paidOn: { type: Date },
    mode: { type: String, trim: true },
    reference: { type: String, trim: true },
    note: { type: String, trim: true },
    recordedById: { type: Schema.Types.ObjectId, ref: 'User' },
    recordedByName: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const counsellingFeeSchema = new Schema<ICounsellingFee>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, unique: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    feeType: { type: String, enum: COUNSELLING_FEE_TYPES, default: 'COUNSELLING_FEE' },
    description: { type: String, trim: true, maxlength: 200 },
    totalFee: { type: Number, required: true, min: 0 },
    currency: { type: String, default: COUNSELLING_FEE_DEFAULT_CURRENCY, uppercase: true, trim: true },
    notes: { type: String, trim: true },
    setById: { type: Schema.Types.ObjectId, ref: 'User' },
    setByName: { type: String, trim: true },
    setAt: { type: Date },
    payments: { type: [counsellingFeePaymentSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const CounsellingFeeModel = model<ICounsellingFee>('CounsellingFee', counsellingFeeSchema);