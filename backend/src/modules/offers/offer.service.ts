import { Types } from 'mongoose';
import { OfferModel, IOffer } from './offer.model';
import { LeadModel } from '../leads/lead.model';
import { ApplicationModel } from '../applications/application.model';
import { OfferStatus, StudentStage, UserRole } from '../../config/constants';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export class OfferService {
  static async getOffersForLead(leadId: string): Promise<any[]> {
    return OfferModel.find({ leadId: new Types.ObjectId(leadId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  static async uploadOriginalOffer(
    leadId: string,
    data: {
      applicationId: string;
      offerType: 'CONDITIONAL' | 'UNCONDITIONAL';
      conditions?: string;
      tuitionFee: number;
      depositAmount: number;
      currency?: string;
      deadlineDate?: string;
      originalOfferUrl: string;
      originalOfferFileName: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IOffer> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const app = await ApplicationModel.findById(data.applicationId);
    if (!app) throw new NotFoundError('Application not found');

    const offer = await OfferModel.create({
      leadId: lead._id,
      studentId: lead.studentUserId,
      applicationId: app._id,
      universityName: app.universityName,
      courseTitle: app.courseTitle,
      offerType: data.offerType,
      conditions: data.conditions,
      tuitionFee: data.tuitionFee,
      depositAmount: data.depositAmount,
      currency: data.currency || 'USD',
      deadlineDate: data.deadlineDate ? new Date(data.deadlineDate) : undefined,
      originalOfferUrl: data.originalOfferUrl,
      originalOfferFileName: data.originalOfferFileName,
      status: OfferStatus.ISSUED,
      uploadedById: new Types.ObjectId(actorUserId),
      uploadedByName: actorName,
    });

    lead.stage = StudentStage.OFFER_MANAGEMENT;
    await lead.save();

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'OFFER_ISSUED',
      title: 'Offer Letter Uploaded',
      description: `Official offer letter uploaded for ${app.courseTitle} at ${app.universityName}`,
    });

    return offer;
  }

  static async uploadSignedOffer(
    offerId: string,
    signedOfferUrl: string,
    signedOfferFileName: string,
    studentUserId: string,
    studentName: string
  ): Promise<IOffer> {
    const offer = await OfferModel.findById(offerId);
    if (!offer) throw new NotFoundError('Offer record not found');

    offer.signedOfferUrl = signedOfferUrl;
    offer.signedOfferFileName = signedOfferFileName;
    offer.signedUploadedAt = new Date();
    offer.status = OfferStatus.SIGNED_UPLOADED;

    await offer.save();

    await ActivityService.log({
      leadId: offer.leadId.toString(),
      studentId: studentUserId,
      actorId: studentUserId,
      actorName: studentName,
      actorRole: UserRole.STUDENT,
      action: 'SIGNED_OFFER_UPLOADED',
      title: 'Signed Offer Uploaded',
      description: 'Student submitted their signed acceptance for the offer letter.',
    });

    return offer;
  }

  static async reviewSignedOffer(
    offerId: string,
    status: OfferStatus.ACCEPTED | OfferStatus.REJECTED,
    notes?: string,
    actorUserId?: string,
    actorName?: string,
    actorRole?: UserRole
  ): Promise<IOffer> {
    const offer = await OfferModel.findById(offerId);
    if (!offer) throw new NotFoundError('Offer record not found');

    const beforeState = offer.toObject();

    offer.status = status;
    offer.reviewedAt = new Date();
    if (actorUserId) {
      offer.reviewedById = new Types.ObjectId(actorUserId);
      offer.reviewedByName = actorName;
    }

    await offer.save();

    // Stage Gating: Accepted Signed Offer unlocks FEE_PAYMENT
    const lead = await LeadModel.findById(offer.leadId);
    if (lead && status === OfferStatus.ACCEPTED) {
      lead.stage = StudentStage.FEE_PAYMENT;
      await lead.save();
    }

    if (actorUserId) {
      await AuditService.log({
        userId: actorUserId,
        userName: actorName,
        userRole: actorRole,
        action: 'REVIEW_SIGNED_OFFER',
        entityType: 'Offer',
        entityId: offerId,
        before: beforeState,
        after: offer.toObject(),
      });
    }

    await ActivityService.log({
      leadId: offer.leadId.toString(),
      studentId: offer.studentId?.toString(),
      actorId: actorUserId,
      actorName: actorName || 'Staff',
      actorRole: actorRole || UserRole.COUNSELLOR,
      action: `OFFER_${status}`,
      title: `Signed Offer ${status === OfferStatus.ACCEPTED ? 'Accepted' : 'Rejected'}`,
      description: `Signed offer was ${status.toLowerCase()} by counsellor. ${notes ? `Notes: ${notes}` : ''}`,
    });

    return offer;
  }
}
