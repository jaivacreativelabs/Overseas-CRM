export enum UserRole {
  STUDENT = 'STUDENT',
  COUNSELLOR = 'COUNSELLOR',
  ADMIN = 'ADMIN',
}

export enum AdminType {
  OWNER_ADMIN = 'OWNER_ADMIN',
  ADMIN = 'ADMIN',
}

export enum LeadSource {
  WEBSITE = 'WEBSITE',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  REFERRAL = 'REFERRAL',
  WALK_IN = 'WALK_IN',
  EVENTS = 'EVENTS',
  MANUAL = 'MANUAL',
  OTHER = 'OTHER',
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  COUNSELLING_SCHEDULED = 'COUNSELLING_SCHEDULED',
  COUNSELLING_COMPLETED = 'COUNSELLING_COMPLETED',
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CLOSED_LOST = 'CLOSED_LOST',
}

export enum StudentStage {
  LEAD_CAPTURED = 'LEAD_CAPTURED',
  PRELIMINARY_COUNSELLING = 'PRELIMINARY_COUNSELLING',
  PROFILE_EVALUATION = 'PROFILE_EVALUATION',
  UNIVERSITY_SHORTLISTING = 'UNIVERSITY_SHORTLISTING',
  DOCUMENT_COLLECTION = 'DOCUMENT_COLLECTION',
  APPLICATION_SUBMISSION = 'APPLICATION_SUBMISSION',
  OFFER_MANAGEMENT = 'OFFER_MANAGEMENT',
  FEE_PAYMENT = 'FEE_PAYMENT',
  VISA_PROCESSING = 'VISA_PROCESSING',
  PRE_DEPARTURE = 'PRE_DEPARTURE',
  DEPARTURE = 'DEPARTURE',
  ARRIVAL_CONFIRMED = 'ARRIVAL_CONFIRMED',
}

export enum DocumentStatus {
  REQUESTED = 'REQUESTED',
  UPLOADED = 'UPLOADED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ApplicationStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  REJECTED = 'REJECTED',
}

export enum OfferStatus {
  ISSUED = 'ISSUED',
  SIGNED_UPLOADED = 'SIGNED_UPLOADED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum PaymentStatus {
  REQUESTED = 'REQUESTED',
  PROOF_SUBMITTED = 'PROOF_SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum VisaStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TravelItemStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  BLOCKED = 'BLOCKED',
}

export enum TaskType {
  FOLLOW_UP = 'FOLLOW_UP',
  DOCUMENT_REVIEW = 'DOCUMENT_REVIEW',
  APPLICATION_SUBMISSION = 'APPLICATION_SUBMISSION',
  PAYMENT_VERIFICATION = 'PAYMENT_VERIFICATION',
  VISA_FOLLOW_UP = 'VISA_FOLLOW_UP',
  OPERATIONAL = 'OPERATIONAL',
  CUSTOM = 'CUSTOM',
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  adminType?: AdminType;
  isActive: boolean;
  leadId?: string;
  assignedCounsellorId?: any;
  stage?: StudentStage;
  avatar?: string;
  createdAt: string;
}

export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  passportNumber?: string;
  targetCountry?: string;
  targetCourse?: string;
  targetIntake?: string;
  budget?: string;
  source: LeadSource;
  status: LeadStatus;
  stage: StudentStage;
  counsellorId?: { _id: string; name: string; email: string; phone?: string; avatar?: string };
  studentUserId?: { _id: string; name: string; email: string };
  closedLostReason?: string;
  notes?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactAttempt {
  _id: string;
  leadId: string;
  attemptDate: string;
  method: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON';
  outcome: 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'SWITCHED_OFF' | 'CALLBACK_REQUESTED' | 'INVALID_NUMBER' | 'WRONG_NUMBER';
  notes?: string;
  callbackDate?: string;
  callbackTime?: string;
  recordedByName: string;
  createdAt: string;
}

export interface CounsellingSession {
  _id: string;
  leadId: string;
  counsellorId: string;
  counsellorName: string;
  scheduledDate: string;
  scheduledTime: string;
  googleMeetLink?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'NO_SHOW';
  attendance: 'PENDING' | 'ATTENDED' | 'ABSENT';
  discussionSummary?: string;
  recommendedCountries?: string[];
  nextSteps?: string;
  createdAt: string;
}

export interface ProfileEvaluation {
  _id: string;
  leadId: string;
  studentId?: string;
  highestQualification?: string;
  institution?: string;
  percentageGpa?: string;
  yearOfPassing?: number;
  backlogsCount?: number;
  testScore?: {
    testType: 'IELTS' | 'PTE' | 'TOEFL' | 'DUOLINGO' | 'NONE';
    overall?: number;
    reading?: number;
    writing?: number;
    listening?: number;
    speaking?: number;
  };
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
  evaluatedByName?: string;
  updatedAt: string;
}

export interface Country {
  _id: string;
  name: string;
  code: string;
  currency: string;
}

export interface University {
  _id: string;
  name: string;
  country: string;
  city?: string;
  website?: string;
  ranking?: number;
  logoUrl?: string;
}

export interface Course {
  _id: string;
  universityId: string;
  universityName: string;
  country: string;
  title: string;
  level: string;
  durationMonths: number;
  annualFee: number;
  currency: string;
  intakes: string[];
}

export interface Shortlist {
  _id: string;
  leadId: string;
  universityId: string;
  universityName: string;
  courseId: string;
  courseTitle: string;
  country: string;
  intake: string;
  annualFee?: number;
  currency?: string;
  isVisibleToStudent: boolean;
  status: 'PROPOSED' | 'APPROVED_BY_COUNSELLOR' | 'SELECTED_BY_STUDENT' | 'REJECTED';
  notes?: string;
  createdAt: string;
}

export interface DocumentItem {
  _id: string;
  leadId: string;
  studentId?: string;
  title: string;
  category: 'ACADEMIC' | 'IDENTITY' | 'FINANCIAL' | 'LANGUAGE_TEST' | 'EXPERIENCE' | 'OTHER';
  description?: string;
  isMandatory: boolean;
  status: DocumentStatus;
  fileUrl?: string;
  originalFileName?: string;
  rejectionReason?: string;
  uploadedAt?: string;
  reviewedAt?: string;
  reviewedByName?: string;
  requestedByName: string;
  createdAt: string;
}

export interface Application {
  _id: string;
  leadId: string;
  universityId: string;
  universityName: string;
  courseId: string;
  courseTitle: string;
  country: string;
  intake: string;
  applicationNumber?: string;
  status: ApplicationStatus;
  submissionDate: string;
  decisionDate?: string;
  rejectionReason?: string;
  portalUsername?: string;
  portalPassword?: string;
  notes?: string;
  createdByName: string;
  createdAt: string;
}

export interface Offer {
  _id: string;
  leadId: string;
  applicationId: string;
  universityName: string;
  courseTitle: string;
  offerType: 'CONDITIONAL' | 'UNCONDITIONAL';
  conditions?: string;
  tuitionFee: number;
  depositAmount: number;
  currency: string;
  deadlineDate?: string;
  status: OfferStatus;
  originalOfferUrl: string;
  originalOfferFileName: string;
  signedOfferUrl?: string;
  signedOfferFileName?: string;
  signedUploadedAt?: string;
  reviewedByName?: string;
  uploadedByName: string;
  createdAt: string;
}

export interface Payment {
  _id: string;
  leadId: string;
  offerId?: string;
  title: string;
  purpose: 'TUITION_DEPOSIT' | 'APPLICATION_FEE' | 'VISA_FEE' | 'INSURANCE' | 'OTHER';
  amount: number;
  currency: string;
  bankDetails?: string;
  dueDate?: string;
  status: PaymentStatus;
  transactionReference?: string;
  paymentMode?: string;
  paidDate?: string;
  proofUrl?: string;
  proofFileName?: string;
  proofSubmittedAt?: string;
  verifiedByName?: string;
  rejectionReason?: string;
  requestedByName: string;
  createdAt: string;
}

export interface VisaRecord {
  _id: string;
  leadId: string;
  country: string;
  visaType: string;
  applicationDate?: string;
  appointmentDate?: string;
  vfsCenterLocation?: string;
  status: VisaStatus;
  decisionDate?: string;
  visaNumber?: string;
  validUntil?: string;
  rejectionReason?: string;
  visaGrantLetterUrl?: string;
  notes?: string;
  updatedByName?: string;
  updatedAt: string;
}

export interface TravelSupport {
  _id: string;
  leadId: string;
  accommodationStatus: 'PENDING' | 'COMPLETED';
  accommodationType?: string;
  accommodationAddress?: string;
  accommodationContact?: string;
  flightStatus: 'PENDING' | 'COMPLETED';
  airline?: string;
  flightNumber?: string;
  flightDate?: string;
  ticketUrl?: string;
  insuranceStatus: 'PENDING' | 'COMPLETED';
  insuranceProvider?: string;
  policyNumber?: string;
  insuranceValidUntil?: string;
  studentDeparted: boolean;
  departureDate?: string;
  arrivalConfirmed: boolean;
  arrivalDate?: string;
  arrivalNotes?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  type: TaskType;
  leadId?: { _id: string; name: string; email: string; phone: string; stage: StudentStage; targetCountry?: string };
  assignedTo: { _id: string; name: string; email: string; avatar?: string };
  assignedToName: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  completionDate?: string;
  createdByName: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  leadId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  isInternalNote: boolean;
  attachments?: { fileUrl: string; fileName: string }[];
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED';
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Activity {
  _id: string;
  leadId?: string;
  studentId?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  userId?: { _id: string; name: string; email: string; role: string; adminType?: string };
  userName?: string;
  userRole?: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
