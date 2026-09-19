import { Types } from 'mongoose';
import {
  CountryModel,
  UniversityModel,
  CourseModel,
  ShortlistModel,
  IShortlist,
  ICountry,
  IUniversity,
  ICourse,
} from './university.model';
import { LeadModel } from '../leads/lead.model';
import { StudentStage, UserRole } from '../../config/constants';
import { NotFoundError, ValidationError, StageLockedError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export class UniversityService {
  // Masters: Countries
  static async getCountries(): Promise<any[]> {
    return CountryModel.find({ isActive: true }).sort({ name: 1 }).lean();
  }

  static async createCountry(data: { name: string; code: string; currency?: string }): Promise<ICountry> {
    return CountryModel.create(data);
  }

  // Masters: Universities
  static async getUniversities(country?: string): Promise<any[]> {
    const filter: Record<string, any> = { isActive: true };
    if (country) filter.country = country;
    return UniversityModel.find(filter).sort({ name: 1 }).lean();
  }

  static async createUniversity(data: {
    name: string;
    country: string;
    city?: string;
    website?: string;
    ranking?: number;
  }): Promise<IUniversity> {
    return UniversityModel.create(data);
  }

  // Masters: Courses
  static async getCourses(universityId?: string, country?: string): Promise<any[]> {
    const filter: Record<string, any> = { isActive: true };
    if (universityId) filter.universityId = new Types.ObjectId(universityId);
    if (country) filter.country = country;
    return CourseModel.find(filter).sort({ title: 1 }).lean();
  }

  static async createCourse(data: {
    universityId: string;
    title: string;
    level: 'BACHELOR' | 'MASTER' | 'DOCTORATE' | 'DIPLOMA';
    durationMonths: number;
    annualFee: number;
    currency?: string;
    intakes?: string[];
  }): Promise<ICourse> {
    const university = await UniversityModel.findById(data.universityId);
    if (!university) {
      throw new NotFoundError('University not found');
    }

    return CourseModel.create({
      ...data,
      universityId: university._id,
      universityName: university.name,
      country: university.country,
      currency: data.currency || 'USD',
      intakes: data.intakes || ['Fall 2026', 'Spring 2027'],
    });
  }

  // Shortlisting Management
  static async getShortlistForLead(leadId: string, isStudentView = false): Promise<any[]> {
    const filter: Record<string, any> = { leadId: new Types.ObjectId(leadId) };
    if (isStudentView) {
      filter.isVisibleToStudent = true;
    }
    return ShortlistModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  static async addToShortlist(
    leadId: string,
    data: {
      universityId: string;
      courseId: string;
      intake: string;
      notes?: string;
      isVisibleToStudent?: boolean;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IShortlist> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    const university = await UniversityModel.findById(data.universityId);
    if (!university) throw new NotFoundError('University not found');

    const course = await CourseModel.findById(data.courseId);
    if (!course) throw new NotFoundError('Course not found');

    const item = await ShortlistModel.create({
      leadId: lead._id,
      studentId: lead.studentUserId,
      universityId: university._id,
      universityName: university.name,
      courseId: course._id,
      courseTitle: course.title,
      country: university.country,
      intake: data.intake,
      annualFee: course.annualFee,
      currency: course.currency,
      notes: data.notes,
      isVisibleToStudent: data.isVisibleToStudent !== undefined ? data.isVisibleToStudent : true,
      status: 'APPROVED_BY_COUNSELLOR',
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'UNIVERSITY_SHORTLISTED',
      title: 'University Shortlisted',
      description: `Shortlisted: ${course.title} at ${university.name} (${data.intake})`,
    });

    return item;
  }

  static async toggleVisibility(
    shortlistId: string,
    isVisible: boolean,
    actorUserId: string,
    actorRole: UserRole
  ): Promise<IShortlist> {
    const item = await ShortlistModel.findById(shortlistId);
    if (!item) throw new NotFoundError('Shortlist entry not found');

    item.isVisibleToStudent = isVisible;
    await item.save();

    await AuditService.log({
      userId: actorUserId,
      userRole: actorRole,
      action: 'TOGGLE_SHORTLIST_VISIBILITY',
      entityType: 'Shortlist',
      entityId: shortlistId,
      after: { isVisibleToStudent: isVisible },
    });

    return item;
  }

  static async studentSelectUniversity(
    leadId: string,
    shortlistId: string,
    studentUserId: string,
    studentName: string
  ): Promise<IShortlist> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const selectedItem = await ShortlistModel.findOne({
      _id: new Types.ObjectId(shortlistId),
      leadId: lead._id,
      isVisibleToStudent: true,
    });

    if (!selectedItem) {
      throw new NotFoundError('Approved shortlist option not found or not visible.');
    }

    // Unselect any previously selected option
    await ShortlistModel.updateMany(
      { leadId: lead._id, _id: { $ne: selectedItem._id } },
      { $set: { status: 'APPROVED_BY_COUNSELLOR' } }
    );

    selectedItem.status = 'SELECTED_BY_STUDENT';
    await selectedItem.save();

    // Advance stage to DOCUMENT_COLLECTION if at UNIVERSITY_SHORTLISTING
    if (lead.stage === StudentStage.UNIVERSITY_SHORTLISTING) {
      lead.stage = StudentStage.DOCUMENT_COLLECTION;
      await lead.save();
    }

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: studentUserId,
      actorId: studentUserId,
      actorName: studentName,
      actorRole: UserRole.STUDENT,
      action: 'UNIVERSITY_SELECTED',
      title: 'University Choice Confirmed',
      description: `Student selected ${selectedItem.courseTitle} at ${selectedItem.universityName} (${selectedItem.intake})`,
    });

    return selectedItem;
  }
}
