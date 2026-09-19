import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from '../../config/constants';

export interface IMessage extends Document {
  leadId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderRole: UserRole;
  recipientId?: Types.ObjectId;
  content: string;
  isInternalNote: boolean; // True = staff only, False = student visible
  attachments?: {
    fileUrl: string;
    fileName: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: Object.values(UserRole), required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true, trim: true },
    isInternalNote: { type: Boolean, default: false, index: true },
    attachments: [
      {
        fileUrl: { type: String },
        fileName: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ leadId: 1, isInternalNote: 1, createdAt: 1 });

export const MessageModel = model<IMessage>('Message', messageSchema);
