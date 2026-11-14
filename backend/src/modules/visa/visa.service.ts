import { Types } from 'mongoose';
import { VisaRecordModel, IVisaRecord, IVisaStatusHistory } from './visa.model';
import { LeadModel } from '../leads/lead.model';
import { UserModel } from '../users/user.model';
import { ApplicationModel } from '../applications/application.model';
import { VisaStatus, StudentStage, UserRole } from '../../config/constants';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';
import { AutomationService } from '../integrations/automation.service';
import { NotificationService } from '../notifications/notification.service';
import { logger } from '../../utils/logger';

export interface VisaListFilters {
  search?: string;
  status?: string;
  country?: string;
  counsellorId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class VisaService {
  /**
   * Sync active leads into VisaRecordModel to guarantee all students are trackable
   */
  static async syncLeadsToVisaRecords(): Promise<void> {
    try {
      const leads = await LeadModel.find({ isArchived: false }).lean();
      for (const lead of leads) {
        const existing = await VisaRecordModel.findOne({ leadId: lead._id });
        if (!existing) {
          // Look up counsellor name
          let counsellorName = 'Unassigned';
          if (lead.counsellorId) {
            const counsellor = await UserModel.findById(lead.counsellorId).lean();
            if (counsellor) counsellorName = counsellor.name;
          }

          // Look up application number & university if available
          const app = await ApplicationModel.findOne({ leadId: lead._id }).lean();

          const studentCustomId = `STU-${lead._id.toString().slice(-6).toUpperCase()}`;
          const applicationId = app?.applicationNumber || `APP-${lead.targetCountry?.slice(0, 3).toUpperCase() || 'INT'}-${lead._id.toString().slice(-5).toUpperCase()}`;
          const universityName = app?.universityName || 'Pending Shortlist';

          let initialStatus = VisaStatus.NOT_STARTED;
          if (lead.stage === StudentStage.VISA_PROCESSING) {
            initialStatus = VisaStatus.UNDER_PROCESSING;
          } else if (lead.stage === StudentStage.PRE_DEPARTURE || lead.stage === StudentStage.DEPARTURE) {
            initialStatus = VisaStatus.APPROVED;
          }

          await VisaRecordModel.create({
            leadId: lead._id,
            studentId: lead.studentUserId,
            studentCustomId,
            studentName: lead.name,
            studentEmail: lead.email,
            applicationId,
            applicationRef: app?._id,
            universityName,
            counsellorId: lead.counsellorId,
            counsellorName,
            country: lead.targetCountry || 'International',
            visaType: 'Student Visa',
            submissionDate: lead.createdAt,
            status: initialStatus,
            decision: initialStatus === VisaStatus.APPROVED ? 'APPROVED' : null,
            decisionDate: initialStatus === VisaStatus.APPROVED ? new Date() : undefined,
            counsellorRemarks: 'Initialized visa record in student pipeline',
            statusHistory: [
              {
                status: initialStatus,
                remarks: 'Initial tracking record created',
                internalRemarks: 'Automated pipeline ingestion',
                studentInstructions: 'Your visa tracking journey has been initiated.',
                changedByName: counsellorName,
                changedAt: new Date(),
              },
            ],
          });
        } else {
          // Sync missing metadata if previously blank
          let needsUpdate = false;
          if (!existing.studentName && lead.name) {
            existing.studentName = lead.name;
            existing.studentEmail = lead.email;
            existing.studentCustomId = `STU-${lead._id.toString().slice(-6).toUpperCase()}`;
            needsUpdate = true;
          }
          if (!existing.counsellorName && lead.counsellorId) {
            const counsellor = await UserModel.findById(lead.counsellorId).lean();
            if (counsellor) {
              existing.counsellorId = lead.counsellorId;
              existing.counsellorName = counsellor.name;
              needsUpdate = true;
            }
          }
          if (!existing.universityName) {
            const app = await ApplicationModel.findOne({ leadId: lead._id }).lean();
            if (app?.universityName) {
              existing.universityName = app.universityName;
              existing.applicationId = app.applicationNumber || existing.applicationId;
              existing.applicationRef = app._id;
              needsUpdate = true;
            }
          }
          if (needsUpdate) {
            await existing.save();
          }
        }
      }
    } catch (err: any) {
      logger.warn('Error syncing leads to visa records:', err?.message);
    }
  }

  /**
   * List visa records with search, filter, pagination, and summary statistics
   */
  static async getVisaRecords(filters: VisaListFilters, currentUser: any): Promise<any> {
    await this.syncLeadsToVisaRecords();

    const query: any = {};

    // Counsellor / Admin role scope
    // Note: If currentUser is student, they should not call this endpoint
    if (currentUser.role === UserRole.STUDENT) {
      throw new ForbiddenError('Students are not authorized to view the reports visa register');
    }

    // Counsellor filter: if requested, filter by counsellorId
    if (filters.counsellorId && filters.counsellorId !== 'ALL') {
      if (filters.counsellorId === 'MY_ASSIGNED') {
        query.counsellorId = new Types.ObjectId(currentUser.userId);
      } else if (Types.ObjectId.isValid(filters.counsellorId)) {
        query.counsellorId = new Types.ObjectId(filters.counsellorId);
      }
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    // Country filter
    if (filters.country && filters.country !== 'ALL') {
      query.country = new RegExp(`^${filters.country}$`, 'i');
    }

    // Search query
    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { studentName: searchRegex },
        { studentCustomId: searchRegex },
        { studentEmail: searchRegex },
        { applicationId: searchRegex },
        { universityName: searchRegex },
        { country: searchRegex },
        { visaNumber: searchRegex },
        { counsellorName: searchRegex },
      ];
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const sortBy = filters.sortBy || 'updatedAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: any = { [sortBy]: sortOrder };

    const [items, total, statsAggregation] = await Promise.all([
      VisaRecordModel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      VisaRecordModel.countDocuments(query),
      VisaRecordModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            underProcessing: {
              $sum: { $cond: [{ $eq: ['$status', VisaStatus.UNDER_PROCESSING] }, 1, 0] },
            },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', VisaStatus.APPROVED] }, 1, 0] },
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', VisaStatus.REJECTED] }, 1, 0] },
            },
            actionRequired: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        VisaStatus.DOCUMENTS_PENDING,
                        VisaStatus.ADDITIONAL_INFO_REQUIRED,
                        VisaStatus.INTERVIEW_SCHEDULED,
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            notStarted: {
              $sum: { $cond: [{ $eq: ['$status', VisaStatus.NOT_STARTED] }, 1, 0] },
            },
            documentsPending: {
              $sum: { $cond: [{ $eq: ['$status', VisaStatus.DOCUMENTS_PENDING] }, 1, 0] },
            },
            submitted: {
              $sum: { $cond: [{ $eq: ['$status', VisaStatus.APPLICATION_SUBMITTED] }, 1, 0] },
            },
            withdrawn: {
              $sum: { $cond: [{ $eq: ['$status', VisaStatus.WITHDRAWN] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const stats = statsAggregation[0] || {
      total: 0,
      underProcessing: 0,
      approved: 0,
      rejected: 0,
      actionRequired: 0,
      notStarted: 0,
      documentsPending: 0,
      submitted: 0,
      withdrawn: 0,
    };

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats,
    };
  }

  /**
   * Get single visa record by ID
   */
  static async getVisaById(id: string, currentUser: any): Promise<any> {
    const visa = await VisaRecordModel.findById(id).lean();
    if (!visa) throw new NotFoundError('Visa record not found');

    // Role check: If student, verify ownership
    if (currentUser.role === UserRole.STUDENT) {
      const isOwner =
        (visa.studentId && visa.studentId.toString() === currentUser.userId) ||
        (currentUser.leadId && visa.leadId.toString() === currentUser.leadId);
      if (!isOwner) {
        throw new ForbiddenError('You are not authorized to view this visa record');
      }

      // Sanitize internal remarks from student response
      delete (visa as any).internalRemarks;
      if (visa.statusHistory) {
        visa.statusHistory = visa.statusHistory.map((h: any) => {
          const { internalRemarks, ...rest } = h;
          return rest;
        });
      }
    }

    return visa;
  }

  /**
   * Get visa record by lead ID
   */
  static async getVisaForLead(leadId: string, currentUser?: any): Promise<any> {
    let visa: any = await VisaRecordModel.findOne({ leadId: new Types.ObjectId(leadId) }).lean();

    if (!visa) {
      // Lazy initialize for lead
      const lead = await LeadModel.findById(leadId).lean();
      if (!lead) throw new NotFoundError('Lead not found');

      let counsellorName = 'Unassigned';
      if (lead.counsellorId) {
        const counsellor = await UserModel.findById(lead.counsellorId).lean();
        if (counsellor) counsellorName = counsellor.name;
      }
      const app = await ApplicationModel.findOne({ leadId: lead._id }).lean();

      const newVisa = await VisaRecordModel.create({
        leadId: lead._id,
        studentId: lead.studentUserId,
        studentCustomId: `STU-${lead._id.toString().slice(-6).toUpperCase()}`,
        studentName: lead.name,
        studentEmail: lead.email,
        applicationId: app?.applicationNumber || `APP-${lead.targetCountry?.slice(0, 3).toUpperCase() || 'INT'}-${lead._id.toString().slice(-5).toUpperCase()}`,
        universityName: app?.universityName || 'Pending Shortlist',
        counsellorId: lead.counsellorId,
        counsellorName,
        country: lead.targetCountry || 'International',
        status: VisaStatus.NOT_STARTED,
        statusHistory: [
          {
            status: VisaStatus.NOT_STARTED,
            remarks: 'Tracking record initialized',
            internalRemarks: 'Automated initialization',
            studentInstructions: 'Visa processing stage opened.',
            changedByName: counsellorName,
            changedAt: new Date(),
          },
        ],
      });
      visa = newVisa.toObject();
    }

    if (!visa) throw new NotFoundError('Visa record not found');

    // Role check: If student, verify ownership and sanitize internal remarks
    if (currentUser && currentUser.role === UserRole.STUDENT) {
      const isOwner =
        (visa.studentId && visa.studentId.toString() === currentUser.userId) ||
        (currentUser.leadId && visa.leadId.toString() === currentUser.leadId) ||
        (leadId.toString() === currentUser.leadId);
      if (!isOwner) {
        throw new ForbiddenError('You are not authorized to view this visa record');
      }

      delete (visa as any).internalRemarks;
      if (visa.statusHistory) {
        visa.statusHistory = visa.statusHistory.map((h: any) => {
          const { internalRemarks, ...rest } = h;
          return rest;
        });
      }
    }

    return visa;
  }

  /**
   * Update visa application status with audit trail and notification dispatch
   */
  static async updateVisaStatus(
    idOrLeadId: string,
    data: {
      status: VisaStatus;
      remarks?: string;
      counsellorRemarks?: string;
      internalRemarks?: string;
      studentInstructions?: string;
      appointmentDate?: Date | string;
      vfsCenterLocation?: string;
      additionalInfoRequired?: string;
      visaNumber?: string;
      decisionDate?: Date | string;
      validUntil?: Date | string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IVisaRecord> {
    if (actorRole === UserRole.STUDENT) {
      throw new ForbiddenError('Students are not authorized to modify official visa status');
    }

    let visa = await VisaRecordModel.findOne({
      $or: [
        { _id: Types.ObjectId.isValid(idOrLeadId) ? new Types.ObjectId(idOrLeadId) : null },
        { leadId: Types.ObjectId.isValid(idOrLeadId) ? new Types.ObjectId(idOrLeadId) : null },
      ].filter(Boolean),
    });

    if (!visa) {
      const lead = await LeadModel.findById(idOrLeadId);
      if (!lead) throw new NotFoundError('Visa record or associated Lead not found');
      visa = new VisaRecordModel({
        leadId: lead._id,
        studentId: lead.studentUserId,
        studentName: lead.name,
        studentEmail: lead.email,
        country: lead.targetCountry || 'International',
        counsellorId: lead.counsellorId,
      });
    }

    const lead = await LeadModel.findById(visa.leadId);
    if (!lead) throw new NotFoundError('Associated student lead not found');

    const previousStatus = visa.status;
    const previousState = visa.toObject();

    // Field Validations based on business requirements
    const remarks = data.remarks || data.counsellorRemarks || '';
    if (data.status === VisaStatus.REJECTED && !remarks.trim()) {
      throw new ValidationError('A refusal/rejection reason is mandatory when marking Visa as Rejected.');
    }
    if (data.status === VisaStatus.WITHDRAWN && !remarks.trim()) {
      throw new ValidationError('A withdrawal justification is mandatory when withdrawing an application.');
    }
    if (data.status === VisaStatus.ADDITIONAL_INFO_REQUIRED && !remarks.trim() && !data.additionalInfoRequired?.trim() && !data.studentInstructions?.trim()) {
      throw new ValidationError('Please specify the exact additional documents or details required for the student.');
    }

    // Apply updates
    visa.status = data.status;
    if (remarks) visa.counsellorRemarks = remarks;
    if (data.internalRemarks !== undefined) visa.internalRemarks = data.internalRemarks;
    if (data.studentInstructions !== undefined) visa.studentInstructions = data.studentInstructions;
    if (data.appointmentDate) visa.appointmentDate = new Date(data.appointmentDate);
    if (data.vfsCenterLocation) visa.vfsCenterLocation = data.vfsCenterLocation;
    if (data.additionalInfoRequired) visa.additionalInfoRequired = data.additionalInfoRequired;
    if (data.visaNumber) visa.visaNumber = data.visaNumber;
    if (data.validUntil) visa.validUntil = new Date(data.validUntil);

    visa.updatedById = new Types.ObjectId(actorUserId);
    visa.updatedByName = actorName;

    // Handle Approval / Rejection decisions
    if (data.status === VisaStatus.APPROVED) {
      visa.decision = 'APPROVED';
      visa.decisionDate = data.decisionDate ? new Date(data.decisionDate) : new Date();
      if (lead.stage === StudentStage.VISA_PROCESSING) {
        lead.stage = StudentStage.PRE_DEPARTURE;
        await lead.save();
      }
    } else if (data.status === VisaStatus.REJECTED) {
      visa.decision = 'REJECTED';
      visa.decisionDate = data.decisionDate ? new Date(data.decisionDate) : new Date();
      visa.rejectionReason = remarks;
    } else if (data.status === VisaStatus.WITHDRAWN) {
      visa.decision = null;
    }

    // Append to status history for full audit trail
    if (!visa.statusHistory) {
      visa.statusHistory = [];
    }
    visa.statusHistory.push({
      status: data.status,
      remarks: remarks || `Status changed from ${previousStatus} to ${data.status}`,
      internalRemarks: data.internalRemarks || '',
      studentInstructions: data.studentInstructions || '',
      changedById: new Types.ObjectId(actorUserId),
      changedByName: actorName,
      changedAt: new Date(),
    });

    await visa.save();

    // Audit Log
    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'UPDATE_VISA_STATUS',
      entityType: 'VisaRecord',
      entityId: visa._id.toString(),
      before: previousState,
      after: visa.toObject(),
    });

    // Activity Log
    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: `VISA_${visa.status}`,
      title: `Visa Status: ${visa.status.replace(/_/g, ' ')}`,
      description: `Visa update recorded as ${visa.status.replace(/_/g, ' ')}. ${remarks ? `Remarks: ${remarks}` : ''}`,
    });

    // Student Notification Trigger (Strictly excludes confidential internal remarks)
    const targetStudentUserId = visa.studentId || lead.studentUserId;
    if (targetStudentUserId && visa.lastNotifiedStatus !== data.status) {
      try {
        let notifTitle = `Visa Status: ${data.status.replace(/_/g, ' ')}`;
        let notifMsg = `Your visa application status for ${visa.country} has been updated to ${data.status.replace(/_/g, ' ')}.`;
        let notifType: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED' = 'INFO';

        switch (data.status) {
          case VisaStatus.APPLICATION_SUBMITTED:
            notifTitle = 'Visa Application Submitted';
            notifMsg = `Your official student visa application for ${visa.country} has been submitted to the embassy. Tracking ID: ${visa.applicationId || 'Recorded'}.`;
            notifType = 'INFO';
            break;
          case VisaStatus.UNDER_PROCESSING:
            notifTitle = 'Visa Under Processing';
            notifMsg = `The embassy has initiated official processing for your ${visa.country} visa. We will notify you once a decision is returned.`;
            notifType = 'INFO';
            break;
          case VisaStatus.ADDITIONAL_INFO_REQUIRED:
            notifTitle = 'Action Required: Additional Information for Visa';
            notifMsg = data.studentInstructions || data.additionalInfoRequired || 'The embassy or counsellor requires additional information for your visa application. Please log in to your portal.';
            notifType = 'ACTION_REQUIRED';
            break;
          case VisaStatus.INTERVIEW_SCHEDULED:
            notifTitle = 'Visa Interview / Appointment Scheduled';
            const aptDateStr = visa.appointmentDate ? new Date(visa.appointmentDate).toLocaleDateString() : 'the scheduled date';
            notifMsg = `Your visa appointment / biometric interview has been scheduled for ${aptDateStr}.${visa.vfsCenterLocation ? ` Location: ${visa.vfsCenterLocation}.` : ''} Please check your portal for preparation checklists.`;
            notifType = 'INFO';
            break;
          case VisaStatus.APPROVED:
            notifTitle = '🎉 Congratulations! Your Student Visa is Approved';
            notifMsg = `Great news! Your visa for ${visa.country} has been officially approved.${visa.visaNumber ? ` Grant Number: ${visa.visaNumber}.` : ''} Pre-departure preparations are now available.`;
            notifType = 'SUCCESS';
            break;
          case VisaStatus.REJECTED:
            notifTitle = 'Visa Decision Update';
            notifMsg = `An embassy decision has been recorded on your visa application. Please connect with your counsellor ${visa.counsellorName || ''} to discuss review options and next steps.`;
            notifType = 'WARNING';
            break;
          case VisaStatus.WITHDRAWN:
            notifTitle = 'Visa Application Withdrawn';
            notifMsg = `Your visa application for ${visa.country} has been marked as withdrawn. Contact your counsellor if you have questions.`;
            notifType = 'INFO';
            break;
          default:
            notifMsg = `Your visa filing status has moved to ${data.status.replace(/_/g, ' ')}. ${data.studentInstructions ? `Instructions: ${data.studentInstructions}` : ''}`;
        }

        await NotificationService.createNotification({
          userId: targetStudentUserId.toString(),
          title: notifTitle,
          message: notifMsg,
          type: notifType,
          actionUrl: '/portal',
        });

        visa.lastNotifiedStatus = data.status;
        await visa.save();
      } catch (notifErr: any) {
        logger.warn('Failed to send student visa notification:', notifErr?.message);
      }
    }

    return visa;
  }

  /**
   * Record Official Visa Decision (Approval or Rejection) with validation and document attachment
   */
  static async recordVisaDecision(
    id: string,
    decisionData: {
      decision: 'APPROVED' | 'REJECTED';
      decisionDate: Date | string;
      remarks: string;
      studentInstructions?: string;
      internalRemarks?: string;
      decisionDocumentUrl?: string;
      decisionDocumentName?: string;
      visaNumber?: string;
      validUntil?: Date | string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IVisaRecord> {
    if (actorRole === UserRole.STUDENT) {
      throw new ForbiddenError('Students cannot record visa decisions');
    }

    if (!['APPROVED', 'REJECTED'].includes(decisionData.decision)) {
      throw new ValidationError('Decision must be either APPROVED or REJECTED');
    }
    if (!decisionData.decisionDate) {
      throw new ValidationError('Decision date is mandatory');
    }
    if (!decisionData.remarks || !decisionData.remarks.trim()) {
      throw new ValidationError('Remarks are mandatory when recording an official visa decision');
    }

    const visa = await VisaRecordModel.findById(id);
    if (!visa) throw new NotFoundError('Visa record not found');

    const lead = await LeadModel.findById(visa.leadId);
    if (!lead) throw new NotFoundError('Associated student lead not found');

    const previousState = visa.toObject();

    visa.decision = decisionData.decision;
    visa.decisionDate = new Date(decisionData.decisionDate);
    visa.status = decisionData.decision === 'APPROVED' ? VisaStatus.APPROVED : VisaStatus.REJECTED;
    visa.counsellorRemarks = decisionData.remarks;
    if (decisionData.studentInstructions !== undefined) visa.studentInstructions = decisionData.studentInstructions;
    if (decisionData.internalRemarks !== undefined) visa.internalRemarks = decisionData.internalRemarks;
    if (decisionData.decisionDocumentUrl) visa.decisionDocumentUrl = decisionData.decisionDocumentUrl;
    if (decisionData.decisionDocumentName) visa.decisionDocumentName = decisionData.decisionDocumentName;
    if (decisionData.visaNumber) visa.visaNumber = decisionData.visaNumber;
    if (decisionData.validUntil) visa.validUntil = new Date(decisionData.validUntil);
    if (decisionData.decision === 'REJECTED') visa.rejectionReason = decisionData.remarks;

    visa.updatedById = new Types.ObjectId(actorUserId);
    visa.updatedByName = actorName;

    // Advance stage to PRE_DEPARTURE if approved
    if (decisionData.decision === 'APPROVED' && lead.stage === StudentStage.VISA_PROCESSING) {
      lead.stage = StudentStage.PRE_DEPARTURE;
      await lead.save();
    }

    // Append to status history
    if (!visa.statusHistory) visa.statusHistory = [];
    visa.statusHistory.push({
      status: visa.status,
      remarks: `Official Decision: ${decisionData.decision}. Remarks: ${decisionData.remarks}`,
      internalRemarks: decisionData.internalRemarks || '',
      studentInstructions: decisionData.studentInstructions || '',
      changedById: new Types.ObjectId(actorUserId),
      changedByName: actorName,
      changedAt: new Date(),
    });

    await visa.save();

    // Audit & Activity Logs
    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'RECORD_VISA_DECISION',
      entityType: 'VisaRecord',
      entityId: visa._id.toString(),
      before: previousState,
      after: visa.toObject(),
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: `DECISION_${decisionData.decision}`,
      title: `Official Visa Decision: ${decisionData.decision}`,
      description: `Official visa decision recorded: ${decisionData.decision} on ${new Date(decisionData.decisionDate).toLocaleDateString()}. Remarks: ${decisionData.remarks}`,
    });

    // Notify Student
    const targetStudentUserId = visa.studentId || lead.studentUserId;
    if (targetStudentUserId) {
      try {
        const notifTitle = decisionData.decision === 'APPROVED'
          ? '🎉 Official Visa Approval Granted!'
          : 'Visa Decision Update';
        const notifMsg = decisionData.decision === 'APPROVED'
          ? `Your visa for ${visa.country} has been officially approved! Decision Date: ${new Date(decisionData.decisionDate).toLocaleDateString()}.${decisionData.studentInstructions ? ` Instructions: ${decisionData.studentInstructions}` : ''}`
          : `A decision has been finalized on your visa application. Decision Date: ${new Date(decisionData.decisionDate).toLocaleDateString()}. Please consult your counsellor for next steps.`;
        const notifType = decisionData.decision === 'APPROVED' ? 'SUCCESS' : 'WARNING';

        await NotificationService.createNotification({
          userId: targetStudentUserId.toString(),
          title: notifTitle,
          message: notifMsg,
          type: notifType,
          actionUrl: '/portal',
        });
        visa.lastNotifiedStatus = visa.status;
        await visa.save();
      } catch (err: any) {
        logger.warn('Failed to send decision notification to student:', err?.message);
      }
    }

    void AutomationService.triggerWorkflows('visa.updated', {
      _id: visa._id.toString(),
      leadId: lead._id.toString(),
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      studentEmail: lead.email,
      status: visa.status,
      rejectionReason: visa.rejectionReason,
      counsellorId: lead.counsellorId?.toString(),
    } as any).catch(() => undefined);

    return visa;
  }
}
