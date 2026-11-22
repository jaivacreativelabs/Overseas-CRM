import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { UserModel } from '../../modules/users/user.model';
import { LeadModel } from '../../modules/leads/lead.model';
import { BranchModel } from '../../modules/branches/branch.model';
import { UserRole, LeadStatus, LeadSource, StudentStage } from '../../config/constants';
import { logger } from '../../utils/logger';

export interface SeedStudentData {
  studentId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  targetCountry: string;
  targetCourse: string;
  targetIntake: string;
  budget: string;
  stage: StudentStage;
  collegeName: string;
  department: string;
  course: string;
  gender: string;
  age: number;
}

export const FIFTEEN_STUDENTS: SeedStudentData[] = [
  {
    studentId: 'STU-2026-0101',
    name: 'Aarav Sharma',
    email: 'aarav.sharma.dtu@gmail.com',
    phone: '+91 98201 14521',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    targetCountry: 'United States',
    targetCourse: 'MS in Computer Science',
    targetIntake: 'Fall 2026',
    budget: '$55,000 USD',
    stage: StudentStage.PROFILE_EVALUATION,
    collegeName: 'Delhi Technological University (DTU), Delhi',
    department: 'Computer Science & Engineering',
    course: 'B.Tech Computer Science & Engineering',
    gender: 'Male',
    age: 22,
  },
  {
    studentId: 'STU-2026-0102',
    name: 'Ananya Iyer',
    email: 'ananya.iyer.annauniv@gmail.com',
    phone: '+91 94440 28193',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    targetCountry: 'United Kingdom',
    targetCourse: 'MSc Wireless Communications & Signal Processing',
    targetIntake: 'Fall 2026',
    budget: '£32,000 GBP',
    stage: StudentStage.UNIVERSITY_SHORTLISTING,
    collegeName: 'College of Engineering, Guindy (Anna University), Chennai',
    department: 'Electronics & Communication Engineering',
    course: 'B.E. Electronics & Communication',
    gender: 'Female',
    age: 21,
  },
  {
    studentId: 'STU-2026-0103',
    name: 'Aditya Verma',
    email: 'aditya.verma.vjti@gmail.com',
    phone: '+91 98192 34567',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    targetCountry: 'Canada',
    targetCourse: 'Master of Information Technology',
    targetIntake: 'Fall 2026',
    budget: '$42,000 CAD',
    stage: StudentStage.DOCUMENT_COLLECTION,
    collegeName: 'Veermata Jijabai Technological Institute (VJTI), Mumbai',
    department: 'Information Technology',
    course: 'B.Tech Information Technology',
    gender: 'Male',
    age: 23,
  },
  {
    studentId: 'STU-2026-0104',
    name: 'Diya Nambiar',
    email: 'diya.nambiar.nitc@gmail.com',
    phone: '+91 97455 61280',
    city: 'Kozhikode',
    state: 'Kerala',
    country: 'India',
    targetCountry: 'Germany',
    targetCourse: 'MSc Molecular Biotechnology & Bioengineering',
    targetIntake: 'Winter 2026',
    budget: '€18,000 EUR',
    stage: StudentStage.PROFILE_EVALUATION,
    collegeName: 'National Institute of Technology (NIT), Calicut',
    department: 'Biotechnology',
    course: 'B.Tech Biotechnology',
    gender: 'Female',
    age: 22,
  },
  {
    studentId: 'STU-2026-0105',
    name: 'Kavya Deshmukh',
    email: 'kavya.deshmukh.coep@gmail.com',
    phone: '+91 98501 72349',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    targetCountry: 'Germany',
    targetCourse: 'MSc Automotive & Mechatronic Systems',
    targetIntake: 'Fall 2026',
    budget: '€20,000 EUR',
    stage: StudentStage.APPLICATION_SUBMISSION,
    collegeName: 'College of Engineering, Pune (COEP)',
    department: 'Mechanical Engineering',
    course: 'B.Tech Mechanical Engineering',
    gender: 'Female',
    age: 23,
  },
  {
    studentId: 'STU-2026-0106',
    name: 'Rohan Kulkarni',
    email: 'rohan.kulkarni.rvce@gmail.com',
    phone: '+91 98223 84910',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    targetCountry: 'United Kingdom',
    targetCourse: 'MSc Advanced Computer Science & AI',
    targetIntake: 'Fall 2026',
    budget: '£36,000 GBP',
    stage: StudentStage.OFFER_MANAGEMENT,
    collegeName: 'RV College of Engineering (RVCE), Bangalore',
    department: 'Artificial Intelligence & Machine Learning',
    course: 'B.E. Artificial Intelligence & Data Science',
    gender: 'Male',
    age: 22,
  },
  {
    studentId: 'STU-2026-0107',
    name: 'Meera Krishnan',
    email: 'meera.krishnan.psg@gmail.com',
    phone: '+91 94471 90234',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    country: 'India',
    targetCountry: 'Australia',
    targetCourse: 'Master of Electrical & Renewable Energy Systems',
    targetIntake: 'Spring 2027',
    budget: '$48,000 AUD',
    stage: StudentStage.FEE_PAYMENT,
    collegeName: 'PSG College of Technology, Coimbatore',
    department: 'Electrical & Electronics Engineering',
    course: 'B.E. Electrical & Electronics Engineering',
    gender: 'Female',
    age: 22,
  },
  {
    studentId: 'STU-2026-0108',
    name: 'Nikhil Joshi',
    email: 'nikhil.joshi.manipal@gmail.com',
    phone: '+91 97640 18235',
    city: 'Udupi',
    state: 'Karnataka',
    country: 'India',
    targetCountry: 'United States',
    targetCourse: 'MS in Data Analytics & Statistics',
    targetIntake: 'Fall 2027',
    budget: '$52,000 USD',
    stage: StudentStage.PROFILE_EVALUATION,
    collegeName: 'Manipal Institute of Technology (MIT), Manipal',
    department: 'Data Science & Analytics',
    course: 'B.Tech Data Science & Engineering',
    gender: 'Male',
    age: 21,
  },
  {
    studentId: 'STU-2026-0109',
    name: 'Sneha Mukherjee',
    email: 'sneha.mukherjee.ju@gmail.com',
    phone: '+91 98302 45618',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    targetCountry: 'Canada',
    targetCourse: 'Master of Applied Chemical Engineering',
    targetIntake: 'Fall 2026',
    budget: '$38,000 CAD',
    stage: StudentStage.VISA_PROCESSING,
    collegeName: 'Jadavpur University, Kolkata',
    department: 'Chemical Engineering',
    course: 'B.E. Chemical Engineering',
    gender: 'Female',
    age: 23,
  },
  {
    studentId: 'STU-2026-0110',
    name: 'Arjun Pillai',
    email: 'arjun.pillai.vit@gmail.com',
    phone: '+91 98460 78129',
    city: 'Vellore',
    state: 'Tamil Nadu',
    country: 'India',
    targetCountry: 'United Kingdom',
    targetCourse: 'MSc Cyber Security & Privacy',
    targetIntake: 'Fall 2026',
    budget: '£30,000 GBP',
    stage: StudentStage.PRE_DEPARTURE,
    collegeName: 'Vellore Institute of Technology (VIT), Vellore',
    department: 'Cyber Security & Digital Forensics',
    course: 'B.Tech Information Security & Cyber Defense',
    gender: 'Male',
    age: 22,
  },
  {
    studentId: 'STU-2026-0111',
    name: 'Pooja Hegde',
    email: 'pooja.hegde.bmsce@gmail.com',
    phone: '+91 99001 23487',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    targetCountry: 'Australia',
    targetCourse: 'Master of Environmental Engineering & Infrastructure',
    targetIntake: 'Spring 2027',
    budget: '$44,000 AUD',
    stage: StudentStage.UNIVERSITY_SHORTLISTING,
    collegeName: 'BMS College of Engineering, Bangalore',
    department: 'Civil & Environmental Engineering',
    course: 'B.E. Civil & Environmental Engineering',
    gender: 'Female',
    age: 22,
  },
  {
    studentId: 'STU-2026-0112',
    name: 'Siddharth Rao',
    email: 'siddharth.rao.cbit@gmail.com',
    phone: '+91 98490 65123',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    targetCountry: 'United States',
    targetCourse: 'MS in Robotics & Intelligent Autonomous Systems',
    targetIntake: 'Fall 2026',
    budget: '$58,000 USD',
    stage: StudentStage.DOCUMENT_COLLECTION,
    collegeName: 'Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad',
    department: 'Robotics & Automation',
    course: 'B.Tech Robotics & Autonomous Systems',
    gender: 'Male',
    age: 23,
  },
  {
    studentId: 'STU-2026-0113',
    name: 'Tanvi Agarwal',
    email: 'tanvi.agarwal.thapar@gmail.com',
    phone: '+91 98103 49012',
    city: 'Patiala',
    state: 'Punjab',
    country: 'India',
    targetCountry: 'Ireland',
    targetCourse: 'MSc Biomedical Engineering & Device Innovation',
    targetIntake: 'Fall 2026',
    budget: '€24,000 EUR',
    stage: StudentStage.DEPARTURE,
    collegeName: 'Thapar Institute of Engineering & Technology, Patiala',
    department: 'Biomedical Engineering',
    course: 'B.E. Biomedical Engineering & Healthcare Tech',
    gender: 'Female',
    age: 22,
  },
  {
    studentId: 'STU-2026-0114',
    name: 'Varun Nair',
    email: 'varun.nair.pes@gmail.com',
    phone: '+91 97462 81903',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    targetCountry: 'United Kingdom',
    targetCourse: 'MSc Aerospace Dynamics & Propulsion',
    targetIntake: 'Fall 2027',
    budget: '£35,000 GBP',
    stage: StudentStage.PROFILE_EVALUATION,
    collegeName: 'PES University, Bangalore',
    department: 'Aerospace Engineering',
    course: 'B.Tech Aerospace Engineering',
    gender: 'Male',
    age: 22,
  },
  {
    studentId: 'STU-2026-0115',
    name: 'Ishita Sen',
    email: 'ishita.sen.bits@gmail.com',
    phone: '+91 98310 92384',
    city: 'Pilani',
    state: 'Rajasthan',
    country: 'India',
    targetCountry: 'United States',
    targetCourse: 'MS in Computational Finance & Quantitative Modeling',
    targetIntake: 'Fall 2026',
    budget: '$62,000 USD',
    stage: StudentStage.ARRIVAL_CONFIRMED,
    collegeName: 'Birla Institute of Technology and Science (BITS), Pilani',
    department: 'Economics & Computational Finance',
    course: 'M.Sc. Economics & B.E. Computer Science Dual Degree',
    gender: 'Female',
    age: 23,
  },
];

/**
 * Idempotently seed or update the 15 student records.
 * Running this multiple times will never duplicate any records.
 */
export async function seedFifteenStudents(): Promise<void> {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password@123', salt);

  // Find counsellor
  const counsellor = await UserModel.findOne({ role: UserRole.COUNSELLOR });
  // Find a branch if available
  const defaultBranch = await BranchModel.findOne({ status: 'ACTIVE' });

  for (const s of FIFTEEN_STUDENTS) {
    const cleanEmail = s.email.toLowerCase().trim();

    // 1. Ensure UserModel account exists and is properly configured
    let user = await UserModel.findOne({ email: cleanEmail });
    if (!user) {
      user = await UserModel.create({
        name: s.name,
        email: cleanEmail,
        passwordHash,
        phone: s.phone,
        role: UserRole.STUDENT,
        assignedCounsellorId: counsellor?._id,
        stage: s.stage,
        isActive: true,
      });
      logger.info(`✓ Created student user account: ${s.email} (${s.studentId})`);
    } else {
      user.name = s.name;
      user.role = UserRole.STUDENT;
      user.passwordHash = passwordHash;
      user.isActive = true;
      user.stage = s.stage;
      if (counsellor) user.assignedCounsellorId = counsellor._id as any;
      await user.save();
    }

    // 2. Ensure LeadModel record exists and is linked
    let lead = await LeadModel.findOne({
      $or: [{ email: cleanEmail }, { studentId: s.studentId }],
    });

    if (!lead) {
      lead = await LeadModel.create({
        studentId: s.studentId,
        name: s.name,
        email: cleanEmail,
        phone: s.phone,
        city: s.city,
        state: s.state,
        country: s.country,
        targetCountry: s.targetCountry,
        targetCourse: s.targetCourse,
        targetIntake: s.targetIntake,
        budget: s.budget,
        source: LeadSource.WEBSITE,
        status: LeadStatus.INTERESTED,
        stage: s.stage,
        collegeName: s.collegeName,
        department: s.department,
        course: s.course,
        gender: s.gender,
        age: s.age,
        studentUserId: user._id as Types.ObjectId,
        counsellorId: counsellor?._id as Types.ObjectId,
        branchId: defaultBranch?._id as Types.ObjectId,
        isArchived: false,
      });
      logger.info(`✓ Created student lead record: ${s.studentId} - ${s.name}`);
    } else {
      lead.studentId = s.studentId;
      lead.name = s.name;
      lead.email = cleanEmail;
      lead.phone = s.phone;
      lead.city = s.city;
      lead.state = s.state;
      lead.country = s.country;
      lead.targetCountry = s.targetCountry;
      lead.targetCourse = s.targetCourse;
      lead.targetIntake = s.targetIntake;
      lead.budget = s.budget;
      lead.status = LeadStatus.INTERESTED;
      lead.stage = s.stage;
      lead.collegeName = s.collegeName;
      lead.department = s.department;
      lead.course = s.course;
      lead.gender = s.gender;
      lead.age = s.age;
      lead.studentUserId = user._id as Types.ObjectId;
      if (counsellor && !lead.counsellorId) lead.counsellorId = counsellor._id as Types.ObjectId;
      if (defaultBranch && !lead.branchId) lead.branchId = defaultBranch._id as Types.ObjectId;
      lead.isArchived = false;
      await lead.save();
    }

    // Link User to Lead
    if (!user.leadId || user.leadId.toString() !== lead._id.toString()) {
      user.leadId = lead._id as Types.ObjectId;
      await user.save();
    }
  }

  logger.info('✅ All 15 student records and user authentication accounts idempotently verified!');
}

