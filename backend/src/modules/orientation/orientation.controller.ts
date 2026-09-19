import { Request, Response, NextFunction } from 'express';
import { OrientationService } from './orientation.service';
import { ApiResponse } from '../../utils/api-response';
import { UserRole } from '../../config/constants';

export class OrientationController {
  static async getOrientations(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.role === UserRole.STUDENT ? req.user.userId : (req.query.studentId as string);
      const orientations = await OrientationService.getOrientations(studentId);
      return ApiResponse.success(res, 'Orientations retrieved', orientations);
    } catch (error) {
      next(error);
    }
  }

  static async createOrientation(req: Request, res: Response, next: NextFunction) {
    try {
      const orientation = await OrientationService.createOrientation(
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Orientation session created', orientation);
    } catch (error) {
      next(error);
    }
  }

  static async markAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const orientation = await OrientationService.markAttendance(
        req.params.id,
        req.body.attendedStudentIds || [],
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Attendance updated', orientation);
    } catch (error) {
      next(error);
    }
  }
}
