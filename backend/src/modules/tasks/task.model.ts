import { Schema, model, Document, Types } from 'mongoose';
import { TaskPriority, TaskStatus, TaskType } from '../../config/constants';

export interface ITask extends Document {
  title: string;
  description?: string;
  type: TaskType;
  leadId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  assignedTo: Types.ObjectId;
  assignedToName: string;
  dueDate: Date;
  priority: TaskPriority;
  status: TaskStatus;
  completionDate?: Date;
  createdBy: Types.ObjectId;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String },
    type: {
      type: String,
      enum: Object.values(TaskType),
      default: TaskType.FOLLOW_UP,
      index: true,
    },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedToName: { type: String, required: true },
    dueDate: { type: Date, required: true, index: true },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
      index: true,
    },
    completionDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });

export const TaskModel = model<ITask>('Task', taskSchema);
