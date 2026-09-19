import { Schema, model, Document, Types } from 'mongoose';

export interface ITestScore {
  testType: 'IELTS' | 'PTE' | 'TOEFL' | 'DUOLINGO' | 'NONE';
  overall?: number;
  reading?: number;
  writing?: number;
  listening?: number;
  speaking?: number;
}

export interface IProfileEvaluation extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  highestQualification?: string;
  institution?: string;
  percentageGpa?: string;
  yearOfPassing?: number;
  backlogsCount?: number;
  testScore?: ITestScore;
  greGmatScore?: string;
  workExperienceMonths?: number;
  workExperienceDetails?: string;
  preferredCountries: string[];
  preferredCourses?: string[];
  budget?: string;
  gapYears?: number;
  gapReason?: string;
  counsellorRemarks?: string;
  isComplete: boolean;
  missingFields: string[];
  evaluatedById?: Types.ObjectId;
  evaluatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const profileEvaluationSchema = new Schema<IProfileEvaluation>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    highestQualification: { type: String, trim: true },
    institution: { type: String, trim: true },
    percentageGpa: { type: String, trim: true },
    yearOfPassing: { type: Number },
    backlogsCount: { type: Number, default: 0 },
    testScore: {
      testType: { type: String, enum: ['IELTS', 'PTE', 'TOEFL', 'DUOLINGO', 'NONE'], default: 'NONE' },
      overall: { type: Number },
      reading: { type: Number },
      writing: { type: Number },
      listening: { type: Number },
      speaking: { type: Number },
    },
    greGmatScore: { type: String },
    workExperienceMonths: { type: Number, default: 0 },
    workExperienceDetails: { type: String },
    preferredCountries: [{ type: String }],
    preferredCourses: [{ type: String }],
    budget: { type: String },
    gapYears: { type: Number, default: 0 },
    gapReason: { type: String },
    counsellorRemarks: { type: String },
    isComplete: { type: Boolean, default: false, index: true },
    missingFields: [{ type: String }],
    evaluatedById: { type: Schema.Types.ObjectId, ref: 'User' },
    evaluatedByName: { type: String },
  },
  {
    timestamps: true,
  }
);

export const ProfileEvaluationModel = model<IProfileEvaluation>('ProfileEvaluation', profileEvaluationSchema);
