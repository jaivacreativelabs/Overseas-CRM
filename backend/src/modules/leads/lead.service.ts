import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { LeadModel, ILead } from './lead.model';
import { ContactAttemptModel, IContactAttempt } from './contact-attempt.model';
import { CounsellingSessionModel, ICounsellingSession } from './counselling-session.model';
import { UserModel } from '../users/user.model';
import { TaskModel } from '../tasks/task.model';
import { ProfileEvaluationModel } from '../profile-evaluation/profile-evaluation.model';
import {
  LeadStatus,
  LeadSource,
  StudentStage,
  UserRole,
  TaskType,
  TaskPriority,
  TaskStatus,
} from '../../config/constants';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  StageLockedError,
} from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export class LeadService {
  static async createLead(data: {
    name: string;
    email: string;
    phone: string;
    city?: string;
    state?: string;
    country?: string;
    targetCountry?: string;
    targetCourse?: string;
    targetIntake?: string;
    budget?: string;
    source?: LeadSource;
    counsellorId?: string;
    notes?: string;
    actorUserId?: string;
    actorName?: string;
    actorRole?: UserRole;
  }): Promise<ILead> {
    const existing = await LeadModel.findOne({ email: data.email.toLowerCase(), isArchived: false });
    if (existing) {
      throw new ValidationError('A lead or student with this email already exists.');
    }

    const lead = await LeadModel.create({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      city: data.city,
      state: data.state,
      country: data.country || 'India',
      targetCountry: data.targetCountry,
      targetCourse: data.targetCourse,
      targetIntake: data.targetIntake,
      budget: data.budget,
      source: data.source || LeadSource.WEBSITE,
      status: LeadStatus.NEW,
      stage: StudentStage.LEAD_CAPTURED,
      counsellorId: data.counsellorId ? new Types.ObjectId(data.counsellorId) : undefined,
      notes: data.notes,
    });

    if (data.actorUserId) {
      await AuditService.log({
        userId: data.actorUserId,
        userName: data.actorName,
        userRole: data.actorRole,
        action: 'CREATE_LEAD',
        entityType: 'Lead',
        entityId: lead._id.toString(),
        after: lead.toObject(),
      });

      await ActivityService.log({
        leadId: lead._id.toString(),
        actorId: data.actorUserId,
        actorName: data.actorName,
        actorRole: data.actorRole,
        action: 'LEAD_CREATED',
        title: 'Lead Created',
        description: `Lead created via ${lead.source} source`,
      });
    }

    return lead;
  }

  static async getLeads(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: LeadStatus;
    stage?: StudentStage;
    source?: LeadSource;
    counsellorId?: string;
    targetCountry?: string;
    isArchived?: boolean;
    isStudent?: boolean;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      isArchived: query.isArchived === true,
    };

    if (query.isStudent) {
      // Students have stage beyond LEAD_CAPTURED / PRELIMINARY_COUNSELLING or status INTERESTED
      filter.$or = [
        { status: LeadStatus.INTERESTED },
        { studentUserId: { $exists: true, $ne: null } },
      ];
    } else if (query.isStudent === false) {
      // Plain leads
      filter.status = { $ne: LeadStatus.INTERESTED };
      filter.studentUserId = null;
    }

    if (query.status) filter.status = query.status;
    if (query.stage) filter.stage = query.stage;
    if (query.source) filter.source = query.source;
    if (query.counsellorId) filter.counsellorId = new Types.ObjectId(query.counsellorId);
    if (query.targetCountry) filter.targetCountry = query.targetCountry;

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
        { city: { $regex: query.search, $options: 'i' } },
        { targetCountry: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [leads, total] = await Promise.all([
      LeadModel.find(filter)
        .populate('counsellorId', 'name email phone avatar')
        .populate('studentUserId', 'name email isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LeadModel.countDocuments(filter),
    ]);

    return {
      leads,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getLeadById(id: string): Promise<any> {
    const lead = await LeadModel.findById(id)
      .populate('counsellorId', 'name email phone avatar')
      .populate('studentUserId', 'name email isActive')
      .lean();

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    const [contactAttempts, counsellingSessions] = await Promise.all([
      ContactAttemptModel.find({ leadId: new Types.ObjectId(id) })
        .sort({ attemptDate: -1 })
        .lean(),
      CounsellingSessionModel.find({ leadId: new Types.ObjectId(id) })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return {
      ...lead,
      contactAttempts,
      counsellingSessions,
    };
  }

  static async updateLead(
    id: string,
    updates: Partial<ILead>,
    actorUserId?: string,
    actorName?: string,
    actorRole?: UserRole
  ): Promise<ILead> {
    const lead = await LeadModel.findById(id);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    const beforeState = lead.toObject();

    Object.assign(lead, updates);
    await lead.save();

    if (actorUserId) {
      await AuditService.log({
        userId: actorUserId,
        userName: actorName,
        userRole: actorRole,
        action: 'UPDATE_LEAD',
        entityType: 'Lead',
        entityId: id,
        before: beforeState,
        after: lead.toObject(),
      });
    }

    return lead;
  }

  static async recordContactAttempt(
    leadId: string,
    data: {
      method: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON';
      outcome: 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'SWITCHED_OFF' | 'CALLBACK_REQUESTED' | 'INVALID_NUMBER' | 'WRONG_NUMBER';
      notes?: string;
      callbackDate?: string;
      callbackTime?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IContactAttempt> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    const contactAttempt = await ContactAttemptModel.create({
      leadId: new Types.ObjectId(leadId),
      method: data.method,
      outcome: data.outcome,
      notes: data.notes,
      callbackDate: data.callbackDate,
      callbackTime: data.callbackTime,
      recordedById: new Types.ObjectId(actorUserId),
      recordedByName: actorName,
    });

    lead.lastContactedAt = new Date();
    if (lead.status === LeadStatus.NEW) {
      lead.status = LeadStatus.CONTACTED;
    }
    await lead.save();

    // Auto-create task if callback is requested
    if (data.outcome === 'CALLBACK_REQUESTED' && data.callbackDate) {
      await TaskModel.create({
        title: `Follow-up Callback: ${lead.name}`,
        description: `Scheduled callback with ${lead.name} (${lead.phone}). Notes: ${data.notes || 'N/A'}`,
        type: TaskType.FOLLOW_UP,
        leadId: lead._id,
        assignedTo: lead.counsellorId || new Types.ObjectId(actorUserId),
        assignedToName: actorName,
        dueDate: new Date(`${data.callbackDate}T${data.callbackTime || '10:00:00'}`),
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        createdBy: new Types.ObjectId(actorUserId),
        createdByName: actorName,
      });
    }

    await ActivityService.log({
      leadId: lead._id.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'CONTACT_ATTEMPT',
      title: `Contact Attempt: ${data.method}`,
      description: `Outcome: ${data.outcome}. ${data.notes ? `Notes: ${data.notes}` : ''}`,
    });

    return contactAttempt;
  }

  static async scheduleCounselling(
    leadId: string,
    data: {
      scheduledDate: string;
      scheduledTime: string;
      googleMeetLink?: string;
      notes?: string;
      counsellorId?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<ICounsellingSession> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    const counsellorId = data.counsellorId || lead.counsellorId?.toString() || actorUserId;
    const counsellorUser = await UserModel.findById(counsellorId);
    const counsellorName = counsellorUser ? counsellorUser.name : actorName;

    const session = await CounsellingSessionModel.create({
      leadId: new Types.ObjectId(leadId),
      counsellorId: new Types.ObjectId(counsellorId),
      counsellorName,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      googleMeetLink: data.googleMeetLink,
      discussionSummary: data.notes,
      status: 'SCHEDULED',
      attendance: 'PENDING',
    });

    lead.status = LeadStatus.COUNSELLING_SCHEDULED;
    lead.stage = StudentStage.PRELIMINARY_COUNSELLING;
    if (!lead.counsellorId) {
      lead.counsellorId = new Types.ObjectId(counsellorId);
    }
    await lead.save();

    await ActivityService.log({
      leadId: lead._id.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'COUNSELLING_SCHEDULED',
      title: 'Preliminary Counselling Scheduled',
      description: `Session scheduled on ${data.scheduledDate} at ${data.scheduledTime} with ${counsellorName}`,
    });

    return session;
  }

  static async updateCounsellingAttendance(
    leadId: string,
    sessionId: string,
    data: {
      attendance: 'ATTENDED' | 'ABSENT';
      status?: 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';
      discussionSummary?: string;
      recommendedCountries?: string[];
      nextSteps?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<ICounsellingSession> {
    const session = await CounsellingSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Counselling session not found');
    }

    session.attendance = data.attendance;
    if (data.status) session.status = data.status;
    else if (data.attendance === 'ATTENDED') session.status = 'COMPLETED';
    else if (data.attendance === 'ABSENT') session.status = 'NO_SHOW';

    if (data.discussionSummary) session.discussionSummary = data.discussionSummary;
    if (data.recommendedCountries) session.recommendedCountries = data.recommendedCountries;
    if (data.nextSteps) session.nextSteps = data.nextSteps;

    await session.save();

    const lead = await LeadModel.findById(leadId);
    if (lead && data.attendance === 'ATTENDED') {
      lead.status = LeadStatus.COUNSELLING_COMPLETED;
      await lead.save();
    }

    await ActivityService.log({
      leadId,
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'COUNSELLING_ATTENDANCE',
      title: `Counselling Attendance: ${data.attendance}`,
      description: `Attendance recorded as ${data.attendance}. Summary: ${data.discussionSummary || 'N/A'}`,
    });

    return session;
  }

  static async convertToInterested(
    leadId: string,
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<{ lead: ILead; studentUser: any }> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Stage Gate: Counselling session must exist before marking Interested
    const sessionExists = await CounsellingSessionModel.findOne({ leadId: lead._id });
    if (!sessionExists) {
      throw new StageLockedError('Preliminary counselling session must be scheduled and recorded before marking Interested.');
    }

    // Check if student user already exists for this email
    let studentUser = await UserModel.findOne({ email: lead.email.toLowerCase() });

    if (!studentUser) {
      const defaultPassword = 'Student@' + Math.floor(1000 + Math.random() * 9000);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      studentUser = await UserModel.create({
        name: lead.name,
        email: lead.email.toLowerCase(),
        passwordHash,
        phone: lead.phone,
        role: UserRole.STUDENT,
        leadId: lead._id,
        assignedCounsellorId: lead.counsellorId || new Types.ObjectId(actorUserId),
        stage: StudentStage.PROFILE_EVALUATION,
        isActive: true,
      });
    }

    lead.status = LeadStatus.INTERESTED;
    lead.stage = StudentStage.PROFILE_EVALUATION;
    lead.studentUserId = studentUser._id as Types.ObjectId;
    await lead.save();

    // Create profile evaluation entry if none exists
    const existingProfile = await ProfileEvaluationModel.findOne({ leadId: lead._id });
    if (!existingProfile) {
      await ProfileEvaluationModel.create({
        leadId: lead._id,
        studentId: studentUser._id,
        preferredCountries: lead.targetCountry ? [lead.targetCountry] : [],
        budget: lead.budget,
        isComplete: false,
      });
    }

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'CONVERT_LEAD_TO_STUDENT',
      entityType: 'Lead',
      entityId: lead._id.toString(),
      after: { leadId: lead._id, studentUserId: studentUser._id, stage: lead.stage },
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: studentUser._id.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'CONVERTED_TO_STUDENT',
      title: 'Converted to Student',
      description: 'Lead marked as Interested. Student Portal account provisioned.',
    });

    return { lead, studentUser };
  }

  static async markClosedLost(
    leadId: string,
    reason: string,
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<ILead> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    lead.previousStatus = lead.status;
    lead.previousStage = lead.stage;
    lead.status = LeadStatus.CLOSED_LOST;
    lead.closedLostReason = reason;

    await lead.save();

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'MARK_CLOSED_LOST',
      entityType: 'Lead',
      entityId: lead._id.toString(),
      after: { status: lead.status, reason },
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'CLOSED_LOST',
      title: 'Marked as Closed Lost',
      description: `Reason: ${reason}`,
    });

    return lead;
  }

  static async reopenClosedLost(
    leadId: string,
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<ILead> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    if (lead.status !== LeadStatus.CLOSED_LOST) {
      throw new ValidationError('Only Closed Lost leads can be reopened.');
    }

    lead.status = lead.previousStatus || LeadStatus.CONTACTED;
    lead.stage = lead.previousStage || StudentStage.LEAD_CAPTURED;
    lead.closedLostReason = undefined;

    await lead.save();

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'REOPEN_CLOSED_LOST',
      entityType: 'Lead',
      entityId: lead._id.toString(),
      after: { status: lead.status, stage: lead.stage },
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'LEAD_REOPENED',
      title: 'Lead Reopened',
      description: `Restored to status ${lead.status} and stage ${lead.stage}`,
    });

    return lead;
  }

  static async archiveLead(
    leadId: string,
    actorUserId: string,
    actorRole: UserRole
  ): Promise<void> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    lead.isArchived = true;
    await lead.save();

    await AuditService.log({
      userId: actorUserId,
      userRole: actorRole,
      action: 'ARCHIVE_LEAD',
      entityType: 'Lead',
      entityId: leadId,
    });
  }

  static async deleteLead(
    leadId: string,
    actorUserId: string,
    actorRole: UserRole
  ): Promise<void> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    await LeadModel.findByIdAndDelete(leadId);

    await AuditService.log({
      userId: actorUserId,
      userRole: actorRole,
      action: 'DELETE_LEAD',
      entityType: 'Lead',
      entityId: leadId,
      before: lead.toObject(),
    });
  }
}
