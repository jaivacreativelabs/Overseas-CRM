import { Request, Response, NextFunction } from 'express';
import { MasterService } from './master.service';
import { ApiResponse } from '../../utils/api-response';

export class MasterController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const masters = await MasterService.getAllMasters();
      return ApiResponse.success(res, 'Masters retrieved', masters);
    } catch (error) {
      next(error);
    }
  }

  static async getByType(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await MasterService.getMastersByType(req.params.type.toUpperCase());
      return ApiResponse.success(res, 'Master items retrieved', items);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await MasterService.createMasterItem(req.body);
      return ApiResponse.created(res, 'Master item created', item);
    } catch (error) {
      next(error);
    }
  }
}
