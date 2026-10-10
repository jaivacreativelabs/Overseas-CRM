import { Types } from 'mongoose';
import { PaymentModel, IPayment } from './payment.model';
import { LeadModel } from '../leads/lead.model';
import { OfferModel } from '../offers/offer.model';
import { PaymentStatus, StudentStage, UserRole, OfferStatus } from '../../config/constants';
import { NotFoundError, ValidationError, StageLockedError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export class PaymentService {
  static async getAllPayments(status?: PaymentStatus): Promise<any[]> {
    const query: any = {};
    if (status) query.status = status;
    return PaymentModel.find(query)
      .populate('leadId', 'name email phone stage targetCountry targetCourse')
      .sort({ createdAt: -1 })
      .lean();
  }

  static async getPaymentsForLead(leadId: string, userRole?: UserRole): Promise<any[]> {
    // Stage Gate: Student access to fee payment is locked until the signed offer is accepted
    if (userRole === UserRole.STUDENT) {
      const acceptedOffer = await OfferModel.findOne({
        leadId: new Types.ObjectId(leadId),
        status: OfferStatus.ACCEPTED,
      });

      if (!acceptedOffer) {
        throw new StageLockedError(
          'Fee Payment is locked. Access to fee payment is enabled only after your signed offer letter has been approved by your counsellor.'
        );
      }
    }

    return PaymentModel.find({ leadId: new Types.ObjectId(leadId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  static async createPaymentRequest(
    leadId: string,
    data: {
      offerId?: string;
      title: string;
      purpose: 'TUITION_DEPOSIT' | 'APPLICATION_FEE' | 'VISA_FEE' | 'INSURANCE' | 'OTHER';
      amount: number;
      currency?: string;
      bankDetails?: string;
      dueDate?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IPayment> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    // Stage Gate: Fee Payment requires an ACCEPTED signed offer letter
    const acceptedOffer = await OfferModel.findOne({
      leadId: lead._id,
      status: OfferStatus.ACCEPTED,
    });

    if (!acceptedOffer) {
      throw new StageLockedError(
        'Fee Payment is locked. A signed offer letter must be reviewed and accepted by a counsellor before generating payment requests.'
      );
    }

    const payment = await PaymentModel.create({
      leadId: lead._id,
      studentId: lead.studentUserId,
      offerId: data.offerId ? new Types.ObjectId(data.offerId) : acceptedOffer._id,
      title: data.title,
      purpose: data.purpose || 'TUITION_DEPOSIT',
      amount: data.amount,
      currency: data.currency || 'USD',
      bankDetails: data.bankDetails,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      status: PaymentStatus.REQUESTED,
      requestedById: new Types.ObjectId(actorUserId),
      requestedByName: actorName,
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'PAYMENT_REQUESTED',
      title: 'Payment Request Generated',
      description: `Payment request for ${payment.currency} ${payment.amount} (${payment.title})`,
    });

    return payment;
  }

  static async submitPaymentProof(
    paymentId: string,
    data: {
      transactionReference: string;
      paymentMode: string;
      paidDate?: string;
      proofUrl: string;
      proofFileName: string;
    },
    studentUserId: string,
    studentName: string
  ): Promise<IPayment> {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment request not found');

    // Stage Gate: Fee Payment requires an ACCEPTED signed offer letter
    const acceptedOffer = await OfferModel.findOne({
      leadId: payment.leadId,
      status: OfferStatus.ACCEPTED,
    });

    if (!acceptedOffer) {
      throw new StageLockedError(
        'Fee Payment is locked. Payment proof cannot be submitted until a signed offer letter is officially accepted.'
      );
    }

    payment.transactionReference = data.transactionReference;
    payment.paymentMode = data.paymentMode;
    payment.paidDate = data.paidDate ? new Date(data.paidDate) : new Date();
    payment.proofUrl = data.proofUrl;
    payment.proofFileName = data.proofFileName;
    payment.proofSubmittedAt = new Date();
    payment.status = PaymentStatus.PROOF_SUBMITTED;
    payment.rejectionReason = undefined;

    await payment.save();

    await ActivityService.log({
      leadId: payment.leadId.toString(),
      studentId: studentUserId,
      actorId: studentUserId,
      actorName: studentName,
      actorRole: UserRole.STUDENT,
      action: 'PAYMENT_PROOF_SUBMITTED',
      title: 'Payment Proof Submitted',
      description: `Proof submitted for Ref: ${data.transactionReference} (${payment.currency} ${payment.amount})`,
    });

    return payment;
  }

  static async verifyPayment(
    paymentId: string,
    data: {
      status: PaymentStatus.VERIFIED | PaymentStatus.REJECTED;
      rejectionReason?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IPayment> {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment record not found');

    if (data.status === PaymentStatus.REJECTED && !data.rejectionReason) {
      throw new ValidationError('A reason must be given when rejecting payment proof.');
    }

    const beforeState = payment.toObject();

    payment.status = data.status;
    payment.rejectionReason = data.status === PaymentStatus.REJECTED ? data.rejectionReason : undefined;
    payment.verifiedAt = new Date();
    payment.verifiedById = new Types.ObjectId(actorUserId);
    payment.verifiedByName = actorName;

    await payment.save();

    const lead = await LeadModel.findById(payment.leadId);
    if (lead && data.status === PaymentStatus.VERIFIED && payment.purpose === 'TUITION_DEPOSIT') {
      lead.stage = StudentStage.VISA_PROCESSING;
      await lead.save();
    }

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'VERIFY_PAYMENT',
      entityType: 'Payment',
      entityId: paymentId,
      before: beforeState,
      after: payment.toObject(),
    });

    await ActivityService.log({
      leadId: payment.leadId.toString(),
      studentId: payment.studentId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: `PAYMENT_${data.status}`,
      title: `Payment ${data.status === PaymentStatus.VERIFIED ? 'Verified' : 'Rejected'}`,
      description: `Payment of ${payment.currency} ${payment.amount} was ${data.status.toLowerCase()}.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`,
    });

    return payment;
  }
}
