import bcrypt from 'bcryptjs';
import { UserModel } from '../../modules/users/user.model';
import { LeadModel } from '../../modules/leads/lead.model';
import { CountryModel, UniversityModel, CourseModel, ShortlistModel } from '../../modules/universities/university.model';
import { MasterItemModel } from '../../modules/masters/master.model';
import { CounsellingSessionModel } from '../../modules/leads/counselling-session.model';
import { ProfileEvaluationModel } from '../../modules/profile-evaluation/profile-evaluation.model';
import { DocumentModel } from '../../modules/documents/document.model';
import { ApplicationModel } from '../../modules/applications/application.model';
import { OfferModel } from '../../modules/offers/offer.model';
import { PaymentModel } from '../../modules/payments/payment.model';
import { VisaRecordModel } from '../../modules/visa/visa.model';
import { TravelSupportModel } from '../../modules/travel/travel.model';
import { TaskModel } from '../../modules/tasks/task.model';
import {
  UserRole,
  AdminType,
  LeadSource,
  LeadStatus,
  StudentStage,
  DocumentStatus,
  ApplicationStatus,
  OfferStatus,
  PaymentStatus,
  VisaStatus,
  TravelItemStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../../config/constants';
import { logger } from '../../utils/logger';

export const seedDatabase = async () => {
  try {
    const userCount = await UserModel.countDocuments();
    if (userCount > 0) {
      logger.info('Database already contains records. Skipping seed.');
      return;
    }

    logger.info('🌱 Empty database detected. Seeding initial data...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    // 1. Create Owner Admin
    const ownerAdmin = await UserModel.create({
      name: 'Jaiva Owner Admin',
      email: 'owner@jaivacrm.com',
      passwordHash,
      phone: '+91 98765 43210',
      role: UserRole.ADMIN,
      adminType: AdminType.OWNER_ADMIN,
      isActive: true,
    });

    // 2. Create Regular Admin
    const regularAdmin = await UserModel.create({
      name: 'Alex Morgan',
      email: 'admin@jaivacrm.com',
      passwordHash,
      phone: '+91 98765 43211',
      role: UserRole.ADMIN,
      adminType: AdminType.ADMIN,
      isActive: true,
    });

    // 3. Create Senior Counsellor
    const counsellor = await UserModel.create({
      name: 'Sarah Jenkins',
      email: 'counsellor@jaivacrm.com',
      passwordHash,
      phone: '+91 98765 43212',
      role: UserRole.COUNSELLOR,
      isActive: true,
    });

    // 4. Create Student User
    const studentUser = await UserModel.create({
      name: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      passwordHash,
      phone: '+91 98111 22334',
      role: UserRole.STUDENT,
      assignedCounsellorId: counsellor._id,
      stage: StudentStage.OFFER_MANAGEMENT,
      isActive: true,
    });

    logger.info('✓ Users seeded (Owner Admin, Admin, Counsellor, Student)');

    // 5. Seed Countries
    const countriesData = [
      { name: 'United Kingdom', code: 'UK', currency: 'GBP' },
      { name: 'United States', code: 'USA', currency: 'USD' },
      { name: 'Canada', code: 'CAN', currency: 'CAD' },
      { name: 'Australia', code: 'AUS', currency: 'AUD' },
      { name: 'Germany', code: 'DEU', currency: 'EUR' },
      { name: 'Ireland', code: 'IRL', currency: 'EUR' },
    ];
    await CountryModel.insertMany(countriesData);

    // 6. Seed Universities & Courses
    const uofOxford = await UniversityModel.create({
      name: 'University of Oxford',
      country: 'United Kingdom',
      city: 'Oxford',
      website: 'https://ox.ac.uk',
      ranking: 1,
    });

    const uofToronto = await UniversityModel.create({
      name: 'University of Toronto',
      country: 'Canada',
      city: 'Toronto',
      website: 'https://utoronto.ca',
      ranking: 18,
    });

    const uofMelbourne = await UniversityModel.create({
      name: 'University of Melbourne',
      country: 'Australia',
      city: 'Melbourne',
      website: 'https://unimelb.edu.au',
      ranking: 33,
    });

    const tumGermany = await UniversityModel.create({
      name: 'Technical University of Munich',
      country: 'Germany',
      city: 'Munich',
      website: 'https://tum.de',
      ranking: 49,
    });

    const courseOxfordCS = await CourseModel.create({
      universityId: uofOxford._id,
      universityName: uofOxford.name,
      country: 'United Kingdom',
      title: 'MSc Advanced Computer Science',
      level: 'MASTER',
      durationMonths: 12,
      annualFee: 32500,
      currency: 'GBP',
      intakes: ['Fall 2026', 'Spring 2027'],
    });

    const courseTorontoData = await CourseModel.create({
      universityId: uofToronto._id,
      universityName: uofToronto.name,
      country: 'Canada',
      title: 'Master of Science in Applied Computing (Data Science)',
      level: 'MASTER',
      durationMonths: 16,
      annualFee: 42000,
      currency: 'CAD',
      intakes: ['Fall 2026'],
    });

    const courseMelbMBA = await CourseModel.create({
      universityId: uofMelbourne._id,
      universityName: uofMelbourne.name,
      country: 'Australia',
      title: 'Master of International Business',
      level: 'MASTER',
      durationMonths: 24,
      annualFee: 46000,
      currency: 'AUD',
      intakes: ['Spring 2027', 'Fall 2026'],
    });

    logger.info('✓ Universities and Courses seeded');

    // 7. Seed Master Items
    const masterItems = [
      { type: 'LEAD_SOURCE', key: 'WEBSITE', label: 'Website Inquiry', order: 1 },
      { type: 'LEAD_SOURCE', key: 'INSTAGRAM', label: 'Instagram Ads', order: 2 },
      { type: 'LEAD_SOURCE', key: 'FACEBOOK', label: 'Facebook Campaign', order: 3 },
      { type: 'LEAD_SOURCE', key: 'REFERRAL', label: 'Student Referral', order: 4 },
      { type: 'LEAD_SOURCE', key: 'WALK_IN', label: 'Branch Walk-in', order: 5 },
      { type: 'LEAD_SOURCE', key: 'EVENTS', label: 'Education Fair 2026', order: 6 },
      { type: 'CLOSED_LOST_REASON', key: 'BUDGET_CONSTRAINTS', label: 'Budget Constraints / Financial Limitations', order: 1 },
      { type: 'CLOSED_LOST_REASON', key: 'CHOSE_COMPETITOR', label: 'Chose Competitor Agency', order: 2 },
      { type: 'CLOSED_LOST_REASON', key: 'CHANGED_MIND', label: 'Postponed / Decided Not to Study Abroad', order: 3 },
      { type: 'CLOSED_LOST_REASON', key: 'VISA_INELIGIBLE', label: 'Visa Ineligible / Low Test Scores', order: 4 },
      { type: 'CLOSED_LOST_REASON', key: 'NO_RESPONSE', label: 'Unresponsive After Multiple Follow-ups', order: 5 },
      { type: 'INTAKE', key: 'FALL_2026', label: 'Fall 2026 (Sep / Oct)', order: 1 },
      { type: 'INTAKE', key: 'SPRING_2027', label: 'Spring 2027 (Jan / Feb)', order: 2 },
      { type: 'INTAKE', key: 'FALL_2027', label: 'Fall 2027', order: 3 },
    ];
    await MasterItemModel.insertMany(masterItems as any);

    // 8. Seed Sample Leads at various stages
    // Lead 1: Rohan Sharma (Converted to Student, Offer stage)
    const leadRohan = await LeadModel.create({
      name: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      phone: '+91 98111 22334',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      targetCountry: 'United Kingdom',
      targetCourse: 'MSc Advanced Computer Science',
      targetIntake: 'Fall 2026',
      budget: '£35,000 - £40,000',
      source: LeadSource.WEBSITE,
      status: LeadStatus.INTERESTED,
      stage: StudentStage.OFFER_MANAGEMENT,
      counsellorId: counsellor._id,
      studentUserId: studentUser._id,
      lastContactedAt: new Date(),
    });

    studentUser.leadId = leadRohan._id;
    await studentUser.save();

    // Counselling session for Rohan
    await CounsellingSessionModel.create({
      leadId: leadRohan._id,
      counsellorId: counsellor._id,
      counsellorName: counsellor.name,
      scheduledDate: '2026-09-10',
      scheduledTime: '15:00',
      googleMeetLink: 'https://meet.google.com/abc-defg-hij',
      status: 'COMPLETED',
      attendance: 'ATTENDED',
      discussionSummary: 'Student has a strong B.Tech background in Computer Science (8.4 CGPA) and IELTS 7.5. Primary target: UK Russell Group universities.',
      recommendedCountries: ['United Kingdom', 'Ireland'],
      nextSteps: 'Complete profile evaluation and proceed with UK shortlist.',
    });

    // Profile evaluation for Rohan
    await ProfileEvaluationModel.create({
      leadId: leadRohan._id,
      studentId: studentUser._id,
      highestQualification: 'B.Tech Computer Science & Engineering',
      institution: 'Delhi Technological University',
      percentageGpa: '8.4 CGPA (80%)',
      yearOfPassing: 2025,
      backlogsCount: 0,
      testScore: {
        testType: 'IELTS',
        overall: 7.5,
        reading: 8.0,
        writing: 7.0,
        listening: 8.0,
        speaking: 7.0,
      },
      workExperienceMonths: 12,
      workExperienceDetails: 'Software Engineer Intern at Tech Corp',
      preferredCountries: ['United Kingdom'],
      preferredCourses: ['MSc Advanced Computer Science', 'MSc Artificial Intelligence'],
      budget: '£35,000',
      isComplete: true,
      missingFields: [],
      evaluatedById: counsellor._id,
      evaluatedByName: counsellor.name,
    });

    // Shortlist for Rohan
    const shortlistRohan = await ShortlistModel.create({
      leadId: leadRohan._id,
      studentId: studentUser._id,
      universityId: uofOxford._id,
      universityName: uofOxford.name,
      courseId: courseOxfordCS._id,
      courseTitle: courseOxfordCS.title,
      country: 'United Kingdom',
      intake: 'Fall 2026',
      annualFee: 32500,
      currency: 'GBP',
      isVisibleToStudent: true,
      status: 'SELECTED_BY_STUDENT',
    });

    // Documents for Rohan
    await DocumentModel.insertMany([
      {
        leadId: leadRohan._id,
        studentId: studentUser._id,
        title: 'Passport Copy (Front & Back)',
        category: 'IDENTITY',
        isMandatory: true,
        status: DocumentStatus.APPROVED,
        fileUrl: '/uploads/sample-passport.pdf',
        originalFileName: 'rohan_passport.pdf',
        reviewedById: counsellor._id,
        reviewedByName: counsellor.name,
        requestedById: counsellor._id,
        requestedByName: counsellor.name,
      },
      {
        leadId: leadRohan._id,
        studentId: studentUser._id,
        title: 'B.Tech Degree Transcripts',
        category: 'ACADEMIC',
        isMandatory: true,
        status: DocumentStatus.APPROVED,
        fileUrl: '/uploads/sample-transcripts.pdf',
        originalFileName: 'dtu_transcripts.pdf',
        reviewedById: counsellor._id,
        reviewedByName: counsellor.name,
        requestedById: counsellor._id,
        requestedByName: counsellor.name,
      },
      {
        leadId: leadRohan._id,
        studentId: studentUser._id,
        title: 'IELTS Official Test Report',
        category: 'LANGUAGE_TEST',
        isMandatory: true,
        status: DocumentStatus.APPROVED,
        fileUrl: '/uploads/sample-ielts.pdf',
        originalFileName: 'ielts_scorecard.pdf',
        reviewedById: counsellor._id,
        reviewedByName: counsellor.name,
        requestedById: counsellor._id,
        requestedByName: counsellor.name,
      },
      {
        leadId: leadRohan._id,
        studentId: studentUser._id,
        title: 'Statement of Purpose (SOP)',
        category: 'ACADEMIC',
        isMandatory: true,
        status: DocumentStatus.APPROVED,
        fileUrl: '/uploads/sample-sop.pdf',
        originalFileName: 'rohan_sop_oxford.pdf',
        reviewedById: counsellor._id,
        reviewedByName: counsellor.name,
        requestedById: counsellor._id,
        requestedByName: counsellor.name,
      },
    ]);

    // Application for Rohan
    const appRohan = await ApplicationModel.create({
      leadId: leadRohan._id,
      studentId: studentUser._id,
      universityId: uofOxford._id,
      universityName: uofOxford.name,
      courseId: courseOxfordCS._id,
      courseTitle: courseOxfordCS.title,
      country: 'United Kingdom',
      intake: 'Fall 2026',
      applicationNumber: 'OXF-2026-88492',
      status: ApplicationStatus.OFFER_RECEIVED,
      submissionDate: new Date('2026-09-12'),
      decisionDate: new Date('2026-09-18'),
      createdById: counsellor._id,
      createdByName: counsellor.name,
    });

    // Offer Letter for Rohan
    await OfferModel.create({
      leadId: leadRohan._id,
      studentId: studentUser._id,
      applicationId: appRohan._id,
      universityName: uofOxford.name,
      courseTitle: courseOxfordCS.title,
      offerType: 'CONDITIONAL',
      conditions: 'Maintain overall 75%+ in final semester and submit official final degree certificate.',
      tuitionFee: 32500,
      depositAmount: 4000,
      currency: 'GBP',
      deadlineDate: new Date('2026-10-15'),
      status: OfferStatus.ISSUED,
      originalOfferUrl: '/uploads/oxford_offer_letter.pdf',
      originalOfferFileName: 'Oxford_Offer_Letter_Rohan.pdf',
      uploadedById: counsellor._id,
      uploadedByName: counsellor.name,
    });

    // Lead 2: Ananya Patel (New Lead, Fresh from Instagram)
    await LeadModel.create({
      name: 'Ananya Patel',
      email: 'ananya.patel@example.com',
      phone: '+91 97234 56789',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      targetCountry: 'Canada',
      targetCourse: 'Master of Data Science',
      targetIntake: 'Fall 2026',
      budget: '$40,000 CAD',
      source: LeadSource.INSTAGRAM,
      status: LeadStatus.NEW,
      stage: StudentStage.LEAD_CAPTURED,
      counsellorId: counsellor._id,
    });

    // Lead 3: Vikram Reddy (Counselling Scheduled)
    const leadVikram = await LeadModel.create({
      name: 'Vikram Reddy',
      email: 'vikram.reddy@example.com',
      phone: '+91 94401 23456',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      targetCountry: 'Australia',
      targetCourse: 'Master of International Business',
      targetIntake: 'Spring 2027',
      budget: '$45,000 AUD',
      source: LeadSource.REFERRAL,
      status: LeadStatus.COUNSELLING_SCHEDULED,
      stage: StudentStage.PRELIMINARY_COUNSELLING,
      counsellorId: counsellor._id,
    });

    await CounsellingSessionModel.create({
      leadId: leadVikram._id,
      counsellorId: counsellor._id,
      counsellorName: counsellor.name,
      scheduledDate: '2026-09-22',
      scheduledTime: '11:00',
      googleMeetLink: 'https://meet.google.com/xyz-uvwx-rst',
      status: 'SCHEDULED',
      attendance: 'PENDING',
      discussionSummary: 'Preliminary discussion regarding G8 universities in Australia and post-study work rights.',
    });

    // Sample Task for Counsellor
    await TaskModel.create({
      title: 'Review Rohan Sharma Signed Offer Acceptance',
      description: 'Check if student has downloaded and re-uploaded signed acceptance for Oxford MSc CS.',
      type: TaskType.DOCUMENT_REVIEW,
      leadId: leadRohan._id,
      assignedTo: counsellor._id,
      assignedToName: counsellor.name,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      priority: TaskPriority.HIGH,
      status: TaskStatus.PENDING,
      createdBy: ownerAdmin._id,
      createdByName: ownerAdmin.name,
    });

    await TaskModel.create({
      title: 'Conduct Counselling Call: Vikram Reddy',
      description: 'Scheduled Zoom/Meet session for Australian universities.',
      type: TaskType.FOLLOW_UP,
      leadId: leadVikram._id,
      assignedTo: counsellor._id,
      assignedToName: counsellor.name,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.PENDING,
      createdBy: counsellor._id,
      createdByName: counsellor.name,
    });

    logger.info('✅ Complete database successfully seeded with realistic enterprise CRM demo records!');
  } catch (error: any) {
    logger.error('Error during database seed:', error);
  }
};
