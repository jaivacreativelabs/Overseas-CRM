import { Types } from 'mongoose';
import { DocumentModel, IDocument } from './document.model';
import { LeadModel } from '../leads/lead.model';
import { DocumentStatus, StudentStage, UserRole } from '../../config/constants';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export class DocumentService {
  static async getDocumentsForLead(leadId: string): Promise<any[]> {
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

    const doc = await DocumentModel.create({
      leadId: lead._id,
      studentId: lead.studentUserId,
      title: data.title,
      category: data.category || 'ACADEMIC',
      description: data.description,
      isMandatory: data.isMandatory !== undefined ? data.isMandatory : true,
      status: DocumentStatus.REQUESTED,
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

    doc.fileUrl = fileData.fileUrl;
    doc.originalFileName = fileData.originalFileName;
    doc.fileSize = fileData.fileSize;
    doc.mimeType = fileData.mimeType;
    doc.status = DocumentStatus.UPLOADED;
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

    return doc;
  }

  static async reviewDocument(
    documentId: string,
    data: {
      status: DocumentStatus.APPROVED | DocumentStatus.REJECTED;
      rejectionReason?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IDocument> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) throw new NotFoundError('Document not found');

    if (data.status === DocumentStatus.REJECTED && !data.rejectionReason) {
      throw new ValidationError('A reason must be provided when rejecting a document.');
    }

    const beforeState = doc.toObject();

    doc.status = data.status;
    doc.rejectionReason = data.status === DocumentStatus.REJECTED ? data.rejectionReason : undefined;
    doc.reviewedAt = new Date();
    doc.reviewedById = new Types.ObjectId(actorUserId);
    doc.reviewedByName = actorName;

    await doc.save();

    // Check if all mandatory documents are approved
    const allDocs = await DocumentModel.find({ leadId: doc.leadId, isMandatory: true });
    const allApproved = allDocs.length > 0 && allDocs.every((d) => d.status === DocumentStatus.APPROVED);

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

    await ActivityService.log({
      leadId: doc.leadId.toString(),
      studentId: doc.studentId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: `DOCUMENT_${data.status}`,
      title: `Document ${data.status === DocumentStatus.APPROVED ? 'Approved' : 'Rejected'}`,
      description: `${doc.title} was ${data.status.toLowerCase()}.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`,
    });

    return doc;
  }
}
