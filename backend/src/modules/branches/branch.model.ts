import { Schema, model, Document, Types } from 'mongoose';

export interface IBranchBankDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankBranch?: string;
  accountType?: 'SAVINGS' | 'CURRENT';
  upiId?: string;
}

export interface IBranch extends Document {
  branchId: string; // Unique backend generated ID e.g. KA-BLR-A81F2C
  name: string;
  state: string;
  city: string;
  address: string;
  pinCode?: string;
  contactNumber?: string;
  email?: string;
  managerName?: string;
  managerEmail?: string;
  managerUserId?: Types.ObjectId;
  assignedStaffIds?: Types.ObjectId[];
  assignedStudentsCount: number;
  openingDate?: Date;
  status: 'ACTIVE' | 'INACTIVE';
  isArchived: boolean;
  notes?: string;
  bankDetails?: IBranchBankDetails;
  createdAt: Date;
  updatedAt: Date;
}

const bankDetailsSchema = new Schema<IBranchBankDetails>(
  {
    accountHolderName: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, uppercase: true, trim: true },
    bankBranch: { type: String, trim: true },
    accountType: { type: String, enum: ['SAVINGS', 'CURRENT'] },
    upiId: { type: String, trim: true },
  },
  { _id: false }
);

const branchSchema = new Schema<IBranch>(
  {
    branchId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    pinCode: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    managerName: {
      type: String,
      trim: true,
    },
    managerEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    managerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedStaffIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    assignedStudentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    bankDetails: {
      type: bankDetailsSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

branchSchema.index({ state: 1, city: 1 });
branchSchema.index({ createdAt: -1 });

export const BranchModel = model<IBranch>('Branch', branchSchema);
