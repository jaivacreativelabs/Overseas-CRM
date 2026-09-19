import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from './application.service';
import { ApiResponse } from '../../utils/api-response';

export class ApplicationController {
  static async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const apps = await ApplicationService.getApplicationsForLead(req.params.leadId);
      return ApiResponse.success(res, 'Applications retrieved', apps);
    } catch (error) {
      next(error);
    }
  }

  static async getApplicationById(req: Request, res: Response, next: NextFunction) {
    try {
      const app = await ApplicationService.getApplicationById(req.params.id);
      return ApiResponse.success(res, 'Application retrieved', app);
    } catch (error) {
      next(error);
    }
  }

  static async createApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const app = await ApplicationService.createApplication(
        req.params.leadId,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Application created successfully', app);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const app = await ApplicationService.updateApplicationStatus(
        req.params.id,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Application status updated', app);
    } catch (error) {
      next(error);
    }
  }
}
