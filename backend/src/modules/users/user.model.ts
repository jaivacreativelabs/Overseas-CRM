import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, AdminType, StudentStage } from '../../config/constants';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: UserRole;
  adminType?: AdminType;
  isActive: boolean;
  isArchived: boolean;
  leadId?: Types.ObjectId;
  assignedCounsellorId?: Types.ObjectId;
  stage?: StudentStage;
  avatar?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: Object.values(UserRole), required: true, index: true },
    adminType: { type: String, enum: Object.values(AdminType) },
    isActive: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    assignedCounsellorId: { type: Schema.Types.ObjectId, ref: 'User' },
    stage: { type: String, enum: Object.values(StudentStage) },
    avatar: { type: String },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const UserModel = model<IUser>('User', userSchema);
