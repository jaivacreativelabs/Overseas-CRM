import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service';
import { ApiResponse } from '../../utils/api-response';

export class ReportController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const period = req.query.period as string;
      const data = await ReportService.getDashboardMetrics(period);
      return ApiResponse.success(res, 'Dashboard metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }
}
