import { Request, Response, NextFunction } from 'express';
import { TravelService } from './travel.service';
import { ApiResponse } from '../../utils/api-response';

export class TravelController {
  static async getTravel(req: Request, res: Response, next: NextFunction) {
    try {
      const travel = await TravelService.getTravelForLead(req.params.leadId);
      return ApiResponse.success(res, 'Travel support details retrieved', travel);
    } catch (error) {
      next(error);
    }
  }

  static async updateDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const travel = await TravelService.updateTravelDetails(
        req.params.leadId,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Travel support details updated', travel);
    } catch (error) {
      next(error);
    }
  }

  static async recordDeparture(req: Request, res: Response, next: NextFunction) {
    try {
      const travel = await TravelService.recordDeparture(
        req.params.leadId,
        req.body.departureDate,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Departure recorded successfully', travel);
    } catch (error) {
      next(error);
    }
  }

  static async recordArrival(req: Request, res: Response, next: NextFunction) {
    try {
      const travel = await TravelService.recordArrival(
        req.params.leadId,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Arrival confirmed successfully', travel);
    } catch (error) {
      next(error);
    }
  }
}
