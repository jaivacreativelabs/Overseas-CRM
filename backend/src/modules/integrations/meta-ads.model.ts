import { Schema, model, Document, Types } from 'mongoose';

export interface IMetaCampaign extends Document {
  campaignId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  objective: string;
  spend: number;
  currency: string;
  impressions: number;
  clicks: number;
  ctr: number;
  leadsCount: number; // Ingested lead responses
  forms: Array<{
    formId: string;
    formName: string;
    branchId?: Types.ObjectId;
    branchName?: string;
  }>;
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMetaFormMapping extends Document {
  formId: string; // Meta Lead Gen Form ID e.g. "meta_form_blr_01"
  formName: string; // e.g. "Bangalore Regional Masters 2026"
  campaignId?: string; // e.g. "cmp_101"
  campaignName: string; // e.g. "UK Autumn Intake Campaign"
  branchId: Types.ObjectId; // Dedicated Target Branch
  branchName: string; // Cached branch name for fast UI queries
  totalLeadsRouted: number;
  lastLeadAt?: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const metaCampaignSchema = new Schema<IMetaCampaign>(
  {
    campaignId: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'], default: 'ACTIVE', index: true },
    objective: { type: String, default: 'LEAD_GENERATION' },
    spend: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    leadsCount: { type: Number, default: 0 },
    forms: [
      {
        formId: { type: String, required: true },
        formName: { type: String, required: true },
        branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
        branchName: { type: String, default: '' },
      },
    ],
    lastSyncAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const metaFormMappingSchema = new Schema<IMetaFormMapping>(
  {
    formId: { type: String, required: true, unique: true, trim: true, index: true },
    formName: { type: String, required: true, trim: true },
    campaignId: { type: String, trim: true },
    campaignName: { type: String, required: true, trim: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    branchName: { type: String, required: true, trim: true },
    totalLeadsRouted: { type: Number, default: 0 },
    lastLeadAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

metaFormMappingSchema.index({ formId: 1, isActive: 1 });

export const MetaCampaignModel = model<IMetaCampaign>('MetaCampaign', metaCampaignSchema);
export const MetaFormMappingModel = model<IMetaFormMapping>('MetaFormMapping', metaFormMappingSchema);

