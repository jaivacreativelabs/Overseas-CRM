import { Types } from 'mongoose';
import { VisaRecordModel, IVisaRecord } from './visa.model';
import { LeadModel } from '../leads/lead.model';
import { VisaStatus, StudentStage, UserRole } from '../../config/constants';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export class VisaService {
  static async getVisaForLead(leadId: string): Promise<any> {
    return VisaRecordModel.findOne({ leadId: new Types.ObjectId(leadId) }).lean();
  }

  static async updateVisaRecord(
    leadId: string,
    data: Partial<IVisaRecord>,
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IVisaRecord> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    let visa = await VisaRecordModel.findOne({ leadId: lead._id });
    if (!visa) {
      visa = new VisaRecordModel({
        leadId: lead._id,
        studentId: lead.studentUserId,
        country: lead.targetCountry || 'International',
      });
    }

    const beforeState = visa.toObject();

    Object.assign(visa, data);
    visa.updatedById = new Types.ObjectId(actorUserId);
    visa.updatedByName = actorName;

    if (data.status === VisaStatus.REJECTED && !data.rejectionReason) {
      throw new ValidationError('A refusal reason is mandatory when marking Visa as Rejected.');
    }

    await visa.save();

    // If Approved, advance stage to PRE_DEPARTURE
    if (data.status === VisaStatus.APPROVED && lead.stage === StudentStage.VISA_PROCESSING) {
      lead.stage = StudentStage.PRE_DEPARTURE;
      await lead.save();
    }

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'UPDATE_VISA_RECORD',
      entityType: 'VisaRecord',
      entityId: visa._id.toString(),
      before: beforeState,
      after: visa.toObject(),
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: `VISA_${visa.status}`,
      title: `Visa Status: ${visa.status}`,
      description: `Visa update recorded as ${visa.status}.${visa.visaNumber ? ` Visa Number: ${visa.visaNumber}` : ''}`,
    });

    return visa;
  }
}
