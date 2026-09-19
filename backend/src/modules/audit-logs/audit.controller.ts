import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { ApiResponse } from '../../utils/api-response';

export class AuditController {
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const entityType = req.query.entityType as string;
      const action = req.query.action as string;
      const userId = req.query.userId as string;

      const result = await AuditService.getLogs({ page, limit, entityType, action, userId });
      return ApiResponse.success(res, 'Audit logs fetched successfully', result.logs, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
}
