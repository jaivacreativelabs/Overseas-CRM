import { Request, Response, NextFunction } from 'express';
import { VisaService } from './visa.service';
import { ApiResponse } from '../../utils/api-response';

export class VisaController {
  static async getVisa(req: Request, res: Response, next: NextFunction) {
    try {
      const visa = await VisaService.getVisaForLead(req.params.leadId);
      return ApiResponse.success(res, 'Visa record retrieved', visa);
    } catch (error) {
      next(error);
    }
  }

  static async updateVisa(req: Request, res: Response, next: NextFunction) {
    try {
      const visa = await VisaService.updateVisaRecord(
        req.params.leadId,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Visa record updated', visa);
    } catch (error) {
      next(error);
    }
  }
}
