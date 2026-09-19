import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { ApiResponse } from '../../utils/api-response';
import { UserRole } from '../../config/constants';

export class UserController {
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const role = req.query.role as UserRole;
      const search = req.query.search as string;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const result = await UserService.getUsers({ page, limit, role, search, isActive });
      return ApiResponse.success(res, 'Users fetched successfully', result.users, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getCounsellors(req: Request, res: Response, next: NextFunction) {
    try {
      const counsellors = await UserService.getCounsellors();
      return ApiResponse.success(res, 'Counsellors list fetched', counsellors);
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getUserById(req.params.id);
      return ApiResponse.success(res, 'User retrieved', user);
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.createUser({
        ...req.body,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
      });
      return ApiResponse.created(res, 'User created successfully', user);
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.updateUser(
        req.params.id,
        req.body,
        req.user?.userId,
        req.user?.role
      );
      return ApiResponse.success(res, 'User updated successfully', user);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      await UserService.deleteUser(req.params.id, req.user?.userId, req.user?.role);
      return ApiResponse.success(res, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
