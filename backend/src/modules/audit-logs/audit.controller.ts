import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { ApiResponse } from '../../utils/api-response';
import { AdminType, UserRole } from '../../config/constants';

/**
 * Owner Admin sees every audit entry. Everyone else (branch admins, counsellors) only sees what
 * they did themselves: their own user id is forced onto the query, so it can't be widened.
 */
const scopeUserId = (req: Request, requestedUserId?: string): string | undefined => {
  const isOwnerAdmin =
    req.user?.role === UserRole.ADMIN &&
    ((req.user as any).adminType === AdminType.OWNER_ADMIN || !(req.user as any).adminType);
  return isOwnerAdmin ? requestedUserId : req.user?.userId;
};

export class AuditController {
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const entityType = req.query.entityType as string;
      const action = req.query.action as string;
      const userId = scopeUserId(req, req.query.userId as string);

      const result = await AuditService.getLogs({ page, limit, entityType, action, userId });
      return ApiResponse.success(res, 'Audit logs fetched successfully', result.logs, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  /** Action names that appear in the logs this viewer may see, for the action filter. */
  static async getActions(req: Request, res: Response, next: NextFunction) {
    try {
      const actions = await AuditService.getActions(scopeUserId(req));
      return ApiResponse.success(res, 'Audit actions fetched successfully', actions);
    } catch (error) {
      next(error);
    }
  }
}
