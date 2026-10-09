import { Schema, model, Document, Types } from 'mongoose';

export interface IBranch extends Document {
  branchId: string; // Unique backend generated ID e.g. KA-BLR-A81F2C
  name: string;
  state: string;
  city: string;
  address: string;
  capacity: number;
  assignedStudentsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  isArchived: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    capacity: {
      type: Number,
      required: true,
      min: [1, 'Capacity must be at least 1'],
      default: 100,
    },
    assignedStudentsCount: {
      type: Number,
      default: 0,
      min: 0,
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
  },
  {
    timestamps: true,
  }
);

branchSchema.index({ state: 1, city: 1 });
branchSchema.index({ createdAt: -1 });

export const BranchModel = model<IBranch>('Branch', branchSchema);
