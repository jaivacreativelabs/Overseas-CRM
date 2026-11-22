import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service';
import { ApiResponse } from '../../utils/api-response';

export class ReportController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const period = req.query.period as string;
      const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
      const data = await ReportService.getDashboardMetrics(period, branchId);
      return ApiResponse.success(res, 'Dashboard metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }
}
