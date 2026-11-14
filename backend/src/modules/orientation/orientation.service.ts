import { Types } from 'mongoose';
import { OrientationModel, IOrientation } from './orientation.model';
import { UserRole } from '../../config/constants';
import { NotFoundError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { UserModel } from '../users/user.model';
import { AutomationService } from '../integrations/automation.service';

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

    if (data.invitedStudentIds && data.invitedStudentIds.length > 0) {
      void (async () => {
        try {
          const students = await UserModel.find({
            _id: { $in: data.invitedStudentIds!.map((id) => new Types.ObjectId(id)) },
          }).lean();

          for (const student of students) {
            if (student.email) {
              void AutomationService.triggerWorkflows('orientation.invited', {
                _id: orientation._id.toString(),
                orientationId: orientation._id.toString(),
                name: student.name,
                email: student.email,
                studentEmail: student.email,
                title: orientation.title,
                country: orientation.country,
                intake: orientation.intake,
                sessionDate: orientation.sessionDate,
                sessionTime: orientation.sessionTime,
                venue: orientation.venue,
                googleMeetLink: orientation.googleMeetLink,
              } as any).catch(() => undefined);
            }
          }
        } catch {}
      })();
    }

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
