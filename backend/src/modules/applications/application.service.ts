import { Types } from 'mongoose';
import { ApplicationModel, IApplication } from './application.model';
import { LeadModel } from '../leads/lead.model';
import { ApplicationStatus, StudentStage, UserRole } from '../../config/constants';
import { NotFoundError, ValidationError, StageLockedError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

const VALID_APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.SUBMITTED]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED],
  [ApplicationStatus.UNDER_REVIEW]: [ApplicationStatus.OFFER_RECEIVED, ApplicationStatus.REJECTED],
  [ApplicationStatus.OFFER_RECEIVED]: [],
  [ApplicationStatus.REJECTED]: [],
};

export class ApplicationService {
  static async getAllApplications(filter: { status?: ApplicationStatus } = {}): Promise<any[]> {
    const query: any = {};
    if (filter.status) {
      query.status = filter.status;
    }
    return ApplicationModel.find(query)
      .populate('leadId', 'name email phone stage targetCountry targetCourse')
      .sort({ createdAt: -1 })
      .lean();
  }

  static async getApplicationsForLead(leadId: string): Promise<any[]> {
    return ApplicationModel.find({ leadId: new Types.ObjectId(leadId) })
      .populate('universityId')
      .populate('courseId')
      .sort({ createdAt: -1 })
      .lean();
  }

  static async getApplicationById(id: string): Promise<IApplication> {
    const app = await ApplicationModel.findById(id);
    if (!app) throw new NotFoundError('Application not found');
    return app;
  }

  static async createApplication(
    leadId: string,
    data: {
      universityId: string;
      universityName: string;
      courseId: string;
      courseTitle: string;
      country: string;
      intake: string;
      applicationNumber?: string;
      portalUsername?: string;
      portalPassword?: string;
      notes?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IApplication> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    // Rule: Only ONE active application at a time (status SUBMITTED or UNDER_REVIEW)
    const existingActive = await ApplicationModel.findOne({
      leadId: lead._id,
      status: { $in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] },
    });

    if (existingActive) {
      throw new ValidationError(
        `There is already an active application (${existingActive.courseTitle} at ${existingActive.universityName}). Complete or resolve it before submitting a new one.`
      );
    }

    const application = await ApplicationModel.create({
      leadId: lead._id,
      studentId: lead.studentUserId,
      universityId: new Types.ObjectId(data.universityId),
      universityName: data.universityName,
      courseId: new Types.ObjectId(data.courseId),
      courseTitle: data.courseTitle,
      country: data.country,
      intake: data.intake,
      applicationNumber: data.applicationNumber,
      portalUsername: data.portalUsername,
      portalPassword: data.portalPassword,
      notes: data.notes,
      status: ApplicationStatus.SUBMITTED,
      createdById: new Types.ObjectId(actorUserId),
      createdByName: actorName,
    });

    lead.stage = StudentStage.APPLICATION_SUBMISSION;
    await lead.save();

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'CREATE_APPLICATION',
      entityType: 'Application',
      entityId: application._id.toString(),
      after: application.toObject(),
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'APPLICATION_SUBMITTED',
      title: 'Application Submitted',
      description: `Application submitted for ${application.courseTitle} at ${application.universityName}`,
    });

    return application;
  }

  static async updateApplicationStatus(
    applicationId: string,
    data: {
      status: ApplicationStatus;
      rejectionReason?: string;
      decisionDate?: Date;
      notes?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IApplication> {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) throw new NotFoundError('Application not found');

    // Terminal state protection: REJECTED and OFFER_RECEIVED are terminal for this application
    if (app.status === ApplicationStatus.REJECTED || app.status === ApplicationStatus.OFFER_RECEIVED) {
      if (data.status !== app.status) {
        throw new ValidationError(
          `Cannot change application status. Current status '${app.status}' is a terminal state and cannot be modified.`
        );
      }
    } else if (data.status !== app.status) {
      // Validate workflow transition: SUBMITTED -> UNDER_REVIEW -> OFFER_RECEIVED / REJECTED
      const allowedNext = VALID_APPLICATION_TRANSITIONS[app.status] || [];
      if (!allowedNext.includes(data.status)) {
        throw new ValidationError(
          `Invalid status transition from '${app.status}' to '${data.status}'. Permitted transitions: ${allowedNext.join(', ') || 'None'}.`
        );
      }
    }

    if (data.status === ApplicationStatus.REJECTED && (!data.rejectionReason || !data.rejectionReason.trim())) {
      throw new ValidationError('A rejection reason is mandatory when marking an application as Rejected.');
    }

    const beforeState = app.toObject();

    app.status = data.status;
    if (data.status === ApplicationStatus.REJECTED) {
      app.rejectionReason = data.rejectionReason?.trim();
      app.decisionDate = data.decisionDate || new Date();
    } else if (data.status === ApplicationStatus.OFFER_RECEIVED) {
      app.decisionDate = data.decisionDate || new Date();
    }
    if (data.notes) app.notes = data.notes;

    await app.save();

    const lead = await LeadModel.findById(app.leadId);
    if (lead) {
      if (data.status === ApplicationStatus.OFFER_RECEIVED) {
        lead.stage = StudentStage.OFFER_MANAGEMENT;
        await lead.save();
      }
    }

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'UPDATE_APPLICATION_STATUS',
      entityType: 'Application',
      entityId: applicationId,
      before: beforeState,
      after: app.toObject(),
    });

    await ActivityService.log({
      leadId: app.leadId.toString(),
      studentId: app.studentId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: `APPLICATION_${data.status}`,
      title: `Application Status: ${data.status}`,
      description: `Status for ${app.universityName} changed to ${data.status}.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`,
    });

    return app;
  }
}
