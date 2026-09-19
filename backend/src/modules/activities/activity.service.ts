import { ActivityModel, IActivity } from './activity.model';
import { Types } from 'mongoose';

export interface CreateActivityParams {
  leadId?: Types.ObjectId | string;
  studentId?: Types.ObjectId | string;
  actorId?: Types.ObjectId | string;
  actorName?: string;
  actorRole?: string;
  action: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export class ActivityService {
  static async log(params: CreateActivityParams): Promise<IActivity> {
    return ActivityModel.create({
      ...params,
      leadId: params.leadId ? new Types.ObjectId(params.leadId.toString()) : undefined,
      studentId: params.studentId ? new Types.ObjectId(params.studentId.toString()) : undefined,
      actorId: params.actorId ? new Types.ObjectId(params.actorId.toString()) : undefined,
    });
  }

  static async getActivitiesForEntity(entityId: string, page = 1, limit = 50) {
    const objectId = new Types.ObjectId(entityId);
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ leadId: objectId }, { studentId: objectId }],
    };

    const [activities, total] = await Promise.all([
      ActivityModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityModel.countDocuments(filter),
    ]);

    return { activities, total, page, limit };
  }
}
