import { Request, Response, NextFunction } from 'express';
import { ProfileEvaluationService } from './profile.service';
import { ApiResponse } from '../../utils/api-response';

export class ProfileEvaluationController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await ProfileEvaluationService.getProfileByLeadId(req.params.leadId);
      return ApiResponse.success(res, 'Profile evaluation retrieved', profile);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await ProfileEvaluationService.updateProfile(
        req.params.leadId,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Profile evaluation updated successfully', profile);
    } catch (error) {
      next(error);
    }
  }
}
