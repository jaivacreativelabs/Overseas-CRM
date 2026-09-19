import { Schema, model, Document, Types } from 'mongoose';

export interface IActivity extends Document {
  leadId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorName?: string;
  actorRole?: string;
  action: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String },
    actorRole: { type: String },
    action: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

activitySchema.index({ createdAt: -1 });

export const ActivityModel = model<IActivity>('Activity', activitySchema);
