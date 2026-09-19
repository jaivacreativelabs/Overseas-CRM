import { Types } from 'mongoose';
import { ProfileEvaluationModel, IProfileEvaluation } from './profile-evaluation.model';
import { LeadModel } from '../leads/lead.model';
import { StudentStage, UserRole } from '../../config/constants';
import { NotFoundError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export class ProfileEvaluationService {
  static MANDATORY_FIELDS = [
    { key: 'highestQualification', label: 'Highest Qualification' },
    { key: 'percentageGpa', label: 'Percentage / GPA' },
    { key: 'yearOfPassing', label: 'Year of Passing' },
    { key: 'preferredCountries', label: 'Preferred Countries' },
    { key: 'budget', label: 'Estimated Budget' },
  ];

  static calculateMissingFields(profile: Partial<IProfileEvaluation>): string[] {
    const missing: string[] = [];
    if (!profile.highestQualification) missing.push('Highest Qualification');
    if (!profile.percentageGpa) missing.push('Percentage / GPA');
    if (!profile.yearOfPassing) missing.push('Year of Passing');
    if (!profile.preferredCountries || profile.preferredCountries.length === 0) missing.push('Preferred Countries');
    if (!profile.budget) missing.push('Estimated Budget');
    return missing;
  }

  static async getProfileByLeadId(leadId: string): Promise<IProfileEvaluation> {
    let profile = await ProfileEvaluationModel.findOne({ leadId: new Types.ObjectId(leadId) });
    if (!profile) {
      const lead = await LeadModel.findById(leadId);
      if (!lead) {
        throw new NotFoundError('Lead not found');
      }
      profile = await ProfileEvaluationModel.create({
        leadId: lead._id,
        studentId: lead.studentUserId,
        preferredCountries: lead.targetCountry ? [lead.targetCountry] : [],
        budget: lead.budget,
        isComplete: false,
        missingFields: ['Highest Qualification', 'Percentage / GPA', 'Year of Passing'],
      });
    }
    return profile;
  }

  static async updateProfile(
    leadId: string,
    data: Partial<IProfileEvaluation>,
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IProfileEvaluation> {
    let profile = await ProfileEvaluationModel.findOne({ leadId: new Types.ObjectId(leadId) });
    const lead = await LeadModel.findById(leadId);

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    if (!profile) {
      profile = new ProfileEvaluationModel({
        leadId: lead._id,
        studentId: lead.studentUserId,
      });
    }

    const beforeState = profile.toObject();

    Object.assign(profile, data);
    profile.evaluatedById = new Types.ObjectId(actorUserId);
    profile.evaluatedByName = actorName;

    const missingFields = this.calculateMissingFields(profile);
    profile.missingFields = missingFields;
    profile.isComplete = missingFields.length === 0;

    await profile.save();

    // If complete and lead is currently at PROFILE_EVALUATION stage, unlock and advance to UNIVERSITY_SHORTLISTING
    if (profile.isComplete && lead.stage === StudentStage.PROFILE_EVALUATION) {
      lead.stage = StudentStage.UNIVERSITY_SHORTLISTING;
      await lead.save();

      await ActivityService.log({
        leadId: lead._id.toString(),
        studentId: lead.studentUserId?.toString(),
        actorId: actorUserId,
        actorName,
        actorRole,
        action: 'PROFILE_EVALUATION_COMPLETED',
        title: 'Profile Evaluation Completed',
        description: 'All mandatory profile criteria verified. Stage unlocked: University Shortlisting.',
      });
    }

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'UPDATE_PROFILE_EVALUATION',
      entityType: 'ProfileEvaluation',
      entityId: profile._id.toString(),
      before: beforeState,
      after: profile.toObject(),
    });

    return profile;
  }
}
