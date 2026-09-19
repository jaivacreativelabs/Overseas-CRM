import { Schema, model, Document } from 'mongoose';

export interface IMasterItem extends Document {
  type: 'LEAD_SOURCE' | 'LEAD_STATUS' | 'CLOSED_LOST_REASON' | 'INTAKE' | 'DOCUMENT_TYPE';
  key: string;
  label: string;
  description?: string;
  isActive: boolean;
  order: number;
}

const masterItemSchema = new Schema<IMasterItem>(
  {
    type: {
      type: String,
      enum: ['LEAD_SOURCE', 'LEAD_STATUS', 'CLOSED_LOST_REASON', 'INTAKE', 'DOCUMENT_TYPE'],
      required: true,
      index: true,
    },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

masterItemSchema.index({ type: 1, key: 1 }, { unique: true });

export const MasterItemModel = model<IMasterItem>('MasterItem', masterItemSchema);
