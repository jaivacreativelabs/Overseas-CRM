import { Schema, model, Document, Types } from 'mongoose';

export interface ICountry extends Document {
  name: string;
  code: string; // ISO 2/3 e.g. UK, USA, CAN
  currency: string;
  isActive: boolean;
}

export interface IUniversity extends Document {
  name: string;
  country: string;
  state?: string;
  city?: string;
  address?: string;
  website?: string;
  ranking?: number;
  customComment?: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  galleryPhotos?: string[];
  overview?: string;
  campusFacilities?: string[];
  establishedYear?: number;
  acceptanceRate?: string;
  averageTuitionFee?: string;
  scholarshipInfo?: string;
  accommodationInfo?: string;
  generalRequirements?: string;
  isActive: boolean;
}

export interface ICourse extends Document {
  universityId: Types.ObjectId;
  universityName: string;
  country: string;
  title: string;
  level: 'BACHELOR' | 'MASTER' | 'DOCTORATE' | 'DIPLOMA';
  durationMonths: number;
  annualFee: number;
  applicationFee?: number;
  currency: string;
  intakes: string[]; // e.g. ["Fall 2026", "Spring 2027"]
  eligibilityRequirements?: string;
  academicRequirements?: string;
  englishRequirements?: string;
  deadlines?: string;
  scholarshipInfo?: string;
  accommodationInfo?: string;
  description?: string;
  isActive: boolean;
}

export interface IShortlist extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  universityId: Types.ObjectId;
  universityName: string;
  courseId: Types.ObjectId;
  courseTitle: string;
  country: string;
  intake: string;
  annualFee?: number;
  applicationFee?: number;
  currency?: string;
  isVisibleToStudent: boolean;
  status: 'PROPOSED' | 'APPROVED_BY_COUNSELLOR' | 'SELECTED_BY_STUDENT' | 'REJECTED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const countrySchema = new Schema<ICountry>({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, trim: true },
  currency: { type: String, default: 'USD' },
  isActive: { type: Boolean, default: true },
});

const universitySchema = new Schema<IUniversity>({
  name: { type: String, required: true, trim: true, index: true },
  country: { type: String, required: true, trim: true, index: true },
  state: { type: String, trim: true },
  city: { type: String, trim: true },
  address: { type: String, trim: true },
  website: { type: String, trim: true },
  ranking: { type: Number },
  customComment: { type: String, default: '', trim: true },
  logoUrl: { type: String, trim: true },
  bannerUrl: { type: String, trim: true },
  description: { type: String, trim: true },
  galleryPhotos: { type: [String], default: [] },
  overview: { type: String, default: '' },
  campusFacilities: { type: [String], default: [] },
  establishedYear: { type: Number },
  acceptanceRate: { type: String, default: '' },
  averageTuitionFee: { type: String, default: '' },
  scholarshipInfo: { type: String },
  accommodationInfo: { type: String },
  generalRequirements: { type: String },
  isActive: { type: Boolean, default: true, index: true },
});

const courseSchema = new Schema<ICourse>({
  universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
  universityName: { type: String, required: true },
  country: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  level: { type: String, enum: ['BACHELOR', 'MASTER', 'DOCTORATE', 'DIPLOMA'], required: true },
  durationMonths: { type: Number, required: true },
  annualFee: { type: Number, required: true },
  applicationFee: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  intakes: [{ type: String }],
  eligibilityRequirements: { type: String },
  academicRequirements: { type: String },
  englishRequirements: { type: String },
  deadlines: { type: String },
  scholarshipInfo: { type: String },
  accommodationInfo: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: true, index: true },
});

const shortlistSchema = new Schema<IShortlist>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    universityName: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    courseTitle: { type: String, required: true },
    country: { type: String, required: true },
    intake: { type: String, required: true },
    annualFee: { type: Number },
    currency: { type: String },
    isVisibleToStudent: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: ['PROPOSED', 'APPROVED_BY_COUNSELLOR', 'SELECTED_BY_STUDENT', 'REJECTED'],
      default: 'APPROVED_BY_COUNSELLOR',
      index: true,
    },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const CountryModel = model<ICountry>('Country', countrySchema);
export const UniversityModel = model<IUniversity>('University', universitySchema);
export const CourseModel = model<ICourse>('Course', courseSchema);
export const ShortlistModel = model<IShortlist>('Shortlist', shortlistSchema);
