import { Request, Response, NextFunction } from 'express';
import { ActivityService } from './activity.service';
import { ApiResponse } from '../../utils/api-response';

export class ActivityController {
  static async getActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const entityId = req.params.entityId;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await ActivityService.getActivitiesForEntity(entityId, page, limit);
      return ApiResponse.success(res, 'Activities retrieved successfully', result.activities, 200, {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      next(error);
    }
  }
}
