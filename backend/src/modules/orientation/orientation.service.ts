import { Types } from 'mongoose';
import { OrientationModel, IOrientation } from './orientation.model';
import { UserRole } from '../../config/constants';
import { NotFoundError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';

export class OrientationService {
  static async getOrientations(studentId?: string): Promise<any[]> {
    const filter: Record<string, any> = {};
    if (studentId) {
      filter.invitedStudentIds = new Types.ObjectId(studentId);
    }
    return OrientationModel.find(filter)
      .populate('invitedStudentIds', 'name email phone')
      .populate('attendedStudentIds', 'name email')
      .sort({ sessionDate: -1 })
      .lean();
  }

  static async createOrientation(
    data: {
      title: string;
      description?: string;
      country: string;
      intake: string;
      sessionDate: string;
      sessionTime: string;
      googleMeetLink?: string;
      venue?: string;
      invitedStudentIds?: string[];
      notes?: string;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IOrientation> {
    const orientation = await OrientationModel.create({
      title: data.title,
      description: data.description,
      country: data.country,
      intake: data.intake,
      sessionDate: new Date(data.sessionDate),
      sessionTime: data.sessionTime,
      googleMeetLink: data.googleMeetLink,
      venue: data.venue,
      invitedStudentIds: (data.invitedStudentIds || []).map((id) => new Types.ObjectId(id)),
      notes: data.notes,
      createdById: new Types.ObjectId(actorUserId),
      createdByName: actorName,
    });

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'CREATE_ORIENTATION',
      entityType: 'Orientation',
      entityId: orientation._id.toString(),
      after: orientation.toObject(),
    });

    return orientation;
  }

  static async markAttendance(
    orientationId: string,
    attendedStudentIds: string[],
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<IOrientation> {
    const orientation = await OrientationModel.findById(orientationId);
    if (!orientation) throw new NotFoundError('Orientation not found');

    orientation.attendedStudentIds = attendedStudentIds.map((id) => new Types.ObjectId(id));
    await orientation.save();

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'MARK_ORIENTATION_ATTENDANCE',
      entityType: 'Orientation',
      entityId: orientationId,
      after: { attendedCount: attendedStudentIds.length },
    });

    return orientation;
  }
}
