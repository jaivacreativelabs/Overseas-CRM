import { Request, Response, NextFunction } from 'express';
import { CounsellingFeeService, CounsellingFeeActor } from './counselling-fee.service';
import { ApiResponse } from '../../utils/api-response';

const buildActor = (req: Request): CounsellingFeeActor => ({
  userId: req.user!.userId,
  name: req.user!.email || 'Staff',
  role: req.user!.role,
});

export class CounsellingFeeController {
  static async getSummaries(req: Request, res: Response, next: NextFunction) {
    try {
      const leadIds = String(req.query.leadIds || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      const summaries = await CounsellingFeeService.getSummaries(leadIds);
      return ApiResponse.success(res, 'Counselling fee summaries retrieved', summaries);
    } catch (error) {
      next(error);
    }
  }

  static async getFeeByLeadId(req: Request, res: Response, next: NextFunction) {
    try {
      const detail = await CounsellingFeeService.getFeeByLeadId(req.params.leadId);
      return ApiResponse.success(res, 'Counselling fee retrieved', detail);
    } catch (error) {
      next(error);
    }
  }

  static async setFee(req: Request, res: Response, next: NextFunction) {
    try {
      const detail = await CounsellingFeeService.setFee(req.params.leadId, req.body, buildActor(req));
      return ApiResponse.success(res, 'Counselling fee updated successfully', detail);
    } catch (error) {
      next(error);
    }
  }

  static async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const detail = await CounsellingFeeService.recordPayment(req.params.leadId, req.body, buildActor(req));
      return ApiResponse.created(res, 'Counselling fee payment recorded successfully', detail);
    } catch (error) {
      next(error);
    }
  }
}