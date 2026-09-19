import { Schema, model, Document, Types } from 'mongoose';

export interface IOrientation extends Document {
  title: string;
  description?: string;
  country: string;
  intake: string;
  sessionDate: Date;
  sessionTime: string;
  googleMeetLink?: string;
  venue?: string;
  invitedStudentIds: Types.ObjectId[];
  attendedStudentIds: Types.ObjectId[];
  notes?: string;
  createdById: Types.ObjectId;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const orientationSchema = new Schema<IOrientation>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    country: { type: String, required: true },
    intake: { type: String, required: true },
    sessionDate: { type: Date, required: true },
    sessionTime: { type: String, required: true },
    googleMeetLink: { type: String },
    venue: { type: String },
    invitedStudentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    attendedStudentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    notes: { type: String },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const OrientationModel = model<IOrientation>('Orientation', orientationSchema);
