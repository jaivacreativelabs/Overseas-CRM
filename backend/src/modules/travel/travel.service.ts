import { Types } from 'mongoose';
import { TravelSupportModel, ITravelSupport } from './travel.model';
import { LeadModel } from '../leads/lead.model';
import { TravelItemStatus, StudentStage, UserRole } from '../../config/constants';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export class TravelService {
  static async getTravelForLead(leadId: string): Promise<ITravelSupport> {
    let travel = await TravelSupportModel.findOne({ leadId: new Types.ObjectId(leadId) });
    if (!travel) {
      const lead = await LeadModel.findById(leadId);
      if (!lead) throw new NotFoundError('Lead not found');

      travel = await TravelSupportModel.create({
        leadId: lead._id,
        studentId: lead.studentUserId,
      });
    }
    return travel;
  }

  static async updateTravelDetails(
    leadId: string,
    data: Partial<ITravelSupport>,
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<ITravelSupport> {
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    let travel = await TravelSupportModel.findOne({ leadId: lead._id });
    if (!travel) {
      travel = new TravelSupportModel({
        leadId: lead._id,
        studentId: lead.studentUserId,
      });
    }

    const beforeState = travel.toObject();

    Object.assign(travel, data);
    await travel.save();

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'UPDATE_TRAVEL_SUPPORT',
      entityType: 'TravelSupport',
      entityId: travel._id.toString(),
      before: beforeState,
      after: travel.toObject(),
    });

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'TRAVEL_DETAILS_UPDATED',
      title: 'Travel Support Details Updated',
      description: 'Pre-departure travel, accommodation, or insurance details were updated.',
    });

    return travel;
  }

  static async recordDeparture(
    leadId: string,
    departureDate: string,
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<ITravelSupport> {
    const travel = await this.getTravelForLead(leadId);
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    travel.studentDeparted = true;
    travel.departureDate = new Date(departureDate);
    await travel.save();

    lead.stage = StudentStage.DEPARTURE;
    await lead.save();

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'STUDENT_DEPARTED',
      title: 'Student Departed',
      description: `Student departure recorded on ${new Date(departureDate).toLocaleDateString()}`,
    });

    return travel;
  }

  static async recordArrival(
    leadId: string,
    data: { arrivalDate: string; notes?: string },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<ITravelSupport> {
    const travel = await this.getTravelForLead(leadId);
    const lead = await LeadModel.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    travel.arrivalConfirmed = true;
    travel.arrivalDate = new Date(data.arrivalDate);
    travel.arrivalNotes = data.notes;
    await travel.save();

    lead.stage = StudentStage.ARRIVAL_CONFIRMED;
    await lead.save();

    await ActivityService.log({
      leadId: lead._id.toString(),
      studentId: lead.studentUserId?.toString(),
      actorId: actorUserId,
      actorName,
      actorRole,
      action: 'ARRIVAL_CONFIRMED',
      title: 'Arrival Confirmed',
      description: `Student arrival confirmed in destination country on ${new Date(data.arrivalDate).toLocaleDateString()}`,
    });

    return travel;
  }
}
