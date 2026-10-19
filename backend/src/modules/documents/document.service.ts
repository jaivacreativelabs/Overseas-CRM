import { Types } from 'mongoose';
import { DocumentModel, IDocument } from './document.model';
import { LeadModel } from '../leads/lead.model';
import { DocumentStatus, StudentStage, UserRole } from '../../config/constants';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';
import { AutomationService } from '../integrations/automation.service';
import { NotificationService } from '../notifications/notification.service';
import { env } from '../../config/env';

export class DocumentService {
  static async getDocumentsForLead(leadId: string, actorUserId?: string, actorRole?: UserRole): Promise<any[]> {
    if (actorRole === UserRole.STUDENT && actorUserId) {
      const studentObjectId = Types.ObjectId.isValid(actorUserId) ? new Types.ObjectId(actorUserId) : null;
      const lead = await LeadModel.findById(leadId);
      if (!lead || !lead.studentUserId || !studentObjectId || lead.studentUserId.toString() !== studentObjectId.toString()) {
        throw new ForbiddenError('Students can only access documents for their own profile.');
      }
    }

    return DocumentModel.find({ leadId: new Types.ObjectId(leadId) })
      .sort({ isMandatory: -1, createdAt: 1 })
      .lean();
  }

  static async requestDocument(
    leadId: string,
    data: {
      title: string;
      category?: 'ACADEMIC' | 'IDENTITY' | 'FINANCIAL' | 'LANGUAGE_TEST' | 'EXPERIENCE' | 'OTHER';
      description?: string;
      isMandatory?: boolean;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IDocument> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    // Deduplicate: check if a pending document with same title exists
    const existing = await DocumentModel.findOne({
      leadId: lead._id,
      title: { $regex: new RegExp(`^${data.title.trim()}$`, 'i') },
      status: { $in: [DocumentStatus.PENDING, DocumentStatus.REQUESTED] },
    });

    if (existing) {
      if (data.description && existing.description !== data.description) {
        existing.description = data.description;
        await existing.save();
      }
      return existing;
    }

    const doc = await DocumentModel.create({
      leadId: lead._id,
      studentId: lead.studentUserId,
      title: data.title.trim(),
      category: data.category || 'ACADEMIC',
      description: data.description,
      isMandatory: data.isMandatory !== undefined ? data.isMandatory : true,
      status: DocumentStatus.PENDING,
      requestedById: new Types.ObjectId(actorUserId),
      requestedByName: actorName,
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'DOCUMENT_REQUESTED',
      title: 'Document Requested',
      description: `Requested document: ${doc.title} (${doc.category})`,
    });

    void AutomationService.triggerWorkflows('document.requested', {
      _id: doc._id.toString(),
      documentId: doc._id.toString(),
      leadId: lead._id.toString(),
      name: lead.name,
      email: lead.email,
      studentEmail: lead.email,
      title: doc.title,
      category: doc.category,
      isMandatory: doc.isMandatory,
      counsellorId: lead.counsellorId?.toString(),
    } as any).catch(() => undefined);

    return doc;
  }

  static async uploadDocument(
    documentId: string,
    fileData: {
      fileUrl: string;
      originalFileName: string;
      fileSize?: number;
      mimeType?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IDocument> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) throw new NotFoundError('Document request not found');

    if (actorRole === UserRole.STUDENT) {
      const studentObjectId = Types.ObjectId.isValid(actorUserId) ? new Types.ObjectId(actorUserId) : null;
      let isOwner = false;
      if (doc.studentId && studentObjectId && doc.studentId.toString() === studentObjectId.toString()) {
        isOwner = true;
      } else {
        const lead = await LeadModel.findById(doc.leadId);
        if (lead && lead.studentUserId && studentObjectId && lead.studentUserId.toString() === studentObjectId.toString()) {
          isOwner = true;
          if (!doc.studentId) {
            doc.studentId = studentObjectId;
          }
        }
      }
      if (!isOwner) {
        throw new ForbiddenError('Students can only upload documents for their own requests.');
      }
    }

    doc.fileUrl = fileData.fileUrl;
    doc.originalFileName = fileData.originalFileName;
    doc.fileSize = fileData.fileSize;
    doc.mimeType = fileData.mimeType;
    doc.status = DocumentStatus.PENDING;
    doc.uploadedAt = new Date();
    doc.rejectionReason = undefined;

    await doc.save();

    await ActivityService.log({
      leadId: doc.leadId.toString(),
      studentId: doc.studentId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'DOCUMENT_UPLOADED',
      title: 'Document Uploaded',
      description: `Uploaded file for: ${doc.title}`,
    });

    const lead = await LeadModel.findById(doc.leadId);
    const recipientUserId = doc.requestedById?.toString() || lead?.counsellorId?.toString();
    if (recipientUserId) {
      const frontendUrl = (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
      void NotificationService.createNotification({
        userId: recipientUserId,
        title: 'Document Uploaded',
        message: `${lead?.name || 'Student'} uploaded ${doc.title}`,
        type: 'INFO',
        actionUrl: `${frontendUrl}/leads/${doc.leadId}`,
      }).catch(() => undefined);
    }

    return doc;
  }

  static async reviewDocument(
    documentId: string,
    data: {
      status: DocumentStatus;
      rejectionReason?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IDocument> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) throw new NotFoundError('Document not found');

    // Normalize status: treat APPROVED as SUCCESSFUL, REJECTED as FAILED if needed, or maintain APPROVED/SUCCESSFUL
    let targetStatus: DocumentStatus = data.status;
    if (data.status === DocumentStatus.APPROVED) {
      targetStatus = DocumentStatus.SUCCESSFUL;
    } else if (data.status === DocumentStatus.REJECTED) {
      targetStatus = DocumentStatus.FAILED;
    }

    const isRejected = targetStatus === DocumentStatus.FAILED || targetStatus === DocumentStatus.REJECTED;

    if (isRejected && !data.rejectionReason) {
      throw new ValidationError('A reason must be provided when rejecting a document.');
    }

    const beforeState = doc.toObject();

    doc.status = targetStatus;
    doc.rejectionReason = isRejected ? data.rejectionReason : undefined;
    doc.reviewedAt = new Date();
    doc.reviewedById = new Types.ObjectId(actorUserId);
    doc.reviewedByName = actorName;

    await doc.save();

    // Check if all mandatory documents are approved (either SUCCESSFUL or APPROVED)
    const allDocs = await DocumentModel.find({ leadId: doc.leadId, isMandatory: true });
    const allApproved =
      allDocs.length > 0 &&
      allDocs.every(
        (d) => d.status === DocumentStatus.SUCCESSFUL || d.status === DocumentStatus.APPROVED
      );

    const lead = await LeadModel.findById(doc.leadId);
    if (lead && allApproved && lead.stage === StudentStage.DOCUMENT_COLLECTION) {
      lead.stage = StudentStage.APPLICATION_SUBMISSION;
      await lead.save();
    }

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'REVIEW_DOCUMENT',
      entityType: 'Document',
      entityId: doc._id.toString(),
      before: beforeState,
      after: doc.toObject(),
    });

    const isApproved = targetStatus === DocumentStatus.SUCCESSFUL || targetStatus === DocumentStatus.APPROVED;

    await ActivityService.log({
      leadId: doc.leadId.toString(),
      studentId: doc.studentId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: isApproved ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
      title: `Document ${isApproved ? 'Approved' : 'Rejected'}`,
      description: `${doc.title} was ${isApproved ? 'approved' : 'rejected'}.${doc.rejectionReason ? ` Reason: ${doc.rejectionReason}` : ''}`,
    });

    if (lead) {
      void AutomationService.triggerWorkflows('document.reviewed', {
        _id: doc._id.toString(),
        documentId: doc._id.toString(),
        leadId: lead._id.toString(),
        name: lead.name,
        email: lead.email,
        studentEmail: lead.email,
        title: doc.title,
        status: doc.status,
        isApproved,
        rejectionReason: doc.rejectionReason,
        counsellorId: lead.counsellorId?.toString(),
      } as any).catch(() => undefined);
    }

    return doc;
  }
}
