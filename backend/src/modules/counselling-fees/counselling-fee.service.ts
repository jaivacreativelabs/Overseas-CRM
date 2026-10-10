import { Types } from 'mongoose';
import { CounsellingFeeModel, ICounsellingFee } from './counselling-fee.model';
import { LeadModel } from '../leads/lead.model';
import { UserRole } from '../../config/constants';
import {
  COUNSELLING_FEE_ACTIONS,
  COUNSELLING_FEE_ACTIVITY_ACTIONS,
  COUNSELLING_FEE_DEFAULT_CURRENCY,
  COUNSELLING_FEE_ENTITY_TYPE,
  CounsellingFeeType,
  CounsellingFeeStatus,
} from './counselling-fee.constants';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export interface CounsellingFeeActor {
  userId: string;
  name: string;
  role: UserRole;
}

export interface CounsellingFeePaymentView {
  amount: number;
  paidOn?: string;
  mode?: string;
  reference?: string;
  note?: string;
  recordedByName?: string;
  createdAt?: string;
}

export interface CounsellingFeeSummary {
  leadId: string;
  isSet: boolean;
  currency: string;
  totalFee: number;
  amountPaid: number;
  outstanding: number;
  status: CounsellingFeeStatus;
  paymentCount: number;
}

export interface CounsellingFeeDetail extends CounsellingFeeSummary {
  feeType: CounsellingFeeType;
  description?: string;
  payments: CounsellingFeePaymentView[];
  notes?: string;
  setByName?: string;
  setAt?: string;
  updatedAt?: string;
}

const roundAmount = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const sumPayments = (record: ICounsellingFee | null): number => {
  if (!record || !Array.isArray(record.payments)) return 0;
  return roundAmount(record.payments.reduce((total, payment) => total + (payment.amount || 0), 0));
};

const resolveStatus = (totalFee: number, amountPaid: number): CounsellingFeeStatus => {
  if (!totalFee || totalFee <= 0) return CounsellingFeeStatus.NOT_SET;
  return amountPaid >= totalFee ? CounsellingFeeStatus.PAID : CounsellingFeeStatus.NOT_PAID;
};

export class CounsellingFeeService {
  static buildSummary(leadId: string, record: ICounsellingFee | null): CounsellingFeeSummary {
    const totalFee = record?.totalFee ? roundAmount(record.totalFee) : 0;
    const amountPaid = sumPayments(record);
    const outstanding = roundAmount(Math.max(totalFee - amountPaid, 0));

    return {
      leadId,
      isSet: totalFee > 0,
      currency: record?.currency || COUNSELLING_FEE_DEFAULT_CURRENCY,
      totalFee,
      amountPaid,
      outstanding,
      status: resolveStatus(totalFee, amountPaid),
      paymentCount: record?.payments?.length || 0,
    };
  }

  private static buildDetail(record: ICounsellingFee | null, leadId: string): CounsellingFeeDetail {
    const summary = this.buildSummary(leadId, record);

    return {
      ...summary,
      feeType: record?.feeType || 'COUNSELLING_FEE',
      description: record?.description,
      payments:
        record?.payments
          ?.slice()
          .sort((a, b) => new Date(b.paidOn || b.createdAt || 0).getTime() - new Date(a.paidOn || a.createdAt || 0).getTime())
          .map((payment) => ({
            amount: roundAmount(payment.amount),
            paidOn: payment.paidOn ? new Date(payment.paidOn).toISOString() : undefined,
            mode: payment.mode,
            reference: payment.reference,
            note: payment.note,
            recordedByName: payment.recordedByName,
            createdAt: payment.createdAt ? new Date(payment.createdAt).toISOString() : undefined,
          })) || [],
      notes: record?.notes,
      setByName: record?.setByName,
      setAt: record?.setAt ? new Date(record.setAt).toISOString() : undefined,
      updatedAt: record?.updatedAt ? new Date(record.updatedAt).toISOString() : undefined,
    };
  }

  static async getFeeByLeadId(leadId: string): Promise<CounsellingFeeDetail> {
    const record = await CounsellingFeeModel.findOne({ leadId: new Types.ObjectId(leadId) });
    return this.buildDetail(record, leadId);
  }

  static async getSummaries(leadIds: string[]): Promise<CounsellingFeeSummary[]> {
    const uniqueIds = Array.from(new Set(leadIds.filter(Boolean)));

    if (uniqueIds.length === 0) return [];

    const validIds = uniqueIds.filter((id) => Types.ObjectId.isValid(id));
    const records = validIds.length
      ? await CounsellingFeeModel.find({ leadId: { $in: validIds.map((id) => new Types.ObjectId(id)) } }).lean()
      : [];

    const recordsByLead = new Map<string, ICounsellingFee>(
      records.map((record) => [record.leadId.toString(), record as unknown as ICounsellingFee])
    );

    return uniqueIds.map((leadId) => this.buildSummary(leadId, recordsByLead.get(leadId) || null));
  }

  static async setFee(
    leadId: string,
    data: {
      feeType: CounsellingFeeType;
      description?: string;
      totalFee: number;
      currency?: string;
      notes?: string;
    },
    actor: CounsellingFeeActor
  ): Promise<CounsellingFeeDetail> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const totalFee = roundAmount(data.totalFee);
    if (!totalFee || totalFee <= 0) {
      throw new ValidationError('Total counselling fee must be greater than 0.');
    }
    const description = data.description?.trim();
    if (data.feeType === 'OTHER' && !description) {
      throw new ValidationError('A description is required for Other fee types.');
    }

    const existing = await CounsellingFeeModel.findOne({ leadId: lead._id });
    const beforeState = existing ? this.buildDetail(existing, leadId) : undefined;

    if (existing) {
      const amountPaid = sumPayments(existing);
      if (totalFee < amountPaid) {
        throw new ValidationError(
          `Total counselling fee cannot be lower than the amount already paid (${amountPaid}).`
        );
      }

      existing.totalFee = totalFee;
      existing.feeType = data.feeType;
      existing.description = data.feeType === 'OTHER' ? description : undefined;
      existing.currency = data.currency || existing.currency || COUNSELLING_FEE_DEFAULT_CURRENCY;
      existing.notes = data.notes;
      existing.setById = new Types.ObjectId(actor.userId);
      existing.setByName = actor.name;
      existing.setAt = new Date();
      if (lead.studentUserId) existing.studentId = lead.studentUserId;
      await existing.save();
    } else {
      await CounsellingFeeModel.create({
        leadId: lead._id,
        studentId: lead.studentUserId,
        feeType: data.feeType,
        description: data.feeType === 'OTHER' ? description : undefined,
        totalFee,
        currency: data.currency || COUNSELLING_FEE_DEFAULT_CURRENCY,
        notes: data.notes,
        setById: new Types.ObjectId(actor.userId),
        setByName: actor.name,
        setAt: new Date(),
        payments: [],
      });
    }

    const afterState = await this.getFeeByLeadId(leadId);

    await AuditService.log({
      userId: actor.userId,
      userName: actor.name,
      userRole: actor.role,
      action: COUNSELLING_FEE_ACTIONS.SET,
      entityType: COUNSELLING_FEE_ENTITY_TYPE,
      entityId: leadId,
      before: beforeState,
      after: afterState,
    });

    await ActivityService.log({
      leadId,
      studentId: lead.studentUserId?.toString(),
      actorId: actor.userId,
      actorName: actor.name,
      actorRole: actor.role,
      action: COUNSELLING_FEE_ACTIVITY_ACTIONS.SET,
      title: 'Counselling Fee Updated',
      description: `Counselling fee set to ${afterState.currency} ${afterState.totalFee}`,
    });

    return afterState;
  }

  static async recordPayment(
    leadId: string,
    data: { amount: number; paidOn?: string; mode?: string; reference?: string; note?: string },
    actor: CounsellingFeeActor
  ): Promise<CounsellingFeeDetail> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const record = await CounsellingFeeModel.findOne({ leadId: lead._id });
    if (!record || record.totalFee <= 0) {
      throw new ValidationError('Set the counselling fee before recording a payment.');
    }

    const amount = roundAmount(data.amount);
    if (!amount || amount <= 0) {
      throw new ValidationError('Payment amount must be greater than 0.');
    }

    const beforeState = this.buildDetail(record, leadId);
    const outstandingBefore = beforeState.outstanding;

    if (amount > outstandingBefore) {
      throw new ValidationError(
        `Payment amount (${amount}) exceeds the outstanding counselling fee balance (${outstandingBefore}).`
      );
    }

    record.payments.push({
      amount,
      paidOn: data.paidOn ? new Date(data.paidOn) : new Date(),
      mode: data.mode,
      reference: data.reference,
      note: data.note,
      recordedById: new Types.ObjectId(actor.userId),
      recordedByName: actor.name,
      createdAt: new Date(),
    });
    if (lead.studentUserId) record.studentId = lead.studentUserId;

    await record.save();

    const afterState = this.buildDetail(record, leadId);

    await AuditService.log({
      userId: actor.userId,
      userName: actor.name,
      userRole: actor.role,
      action: COUNSELLING_FEE_ACTIONS.PAYMENT_RECORDED,
      entityType: COUNSELLING_FEE_ENTITY_TYPE,
      entityId: leadId,
      before: beforeState,
      after: afterState,
    });

    await ActivityService.log({
      leadId,
      studentId: lead.studentUserId?.toString(),
      actorId: actor.userId,
      actorName: actor.name,
      actorRole: actor.role,
      action: COUNSELLING_FEE_ACTIVITY_ACTIONS.PAYMENT_RECORDED,
      title: 'Counselling Fee Payment Recorded',
      description: `Payment of ${afterState.currency} ${amount} recorded. Outstanding balance: ${afterState.outstanding}`,
    });

    return afterState;
  }
}