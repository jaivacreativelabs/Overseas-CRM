import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { ApiResponse } from '../../utils/api-response';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const notifications = await NotificationService.getUserNotifications(req.user!.userId);
      return ApiResponse.success(res, 'Notifications retrieved', notifications);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationService.markAsRead(req.params.id);
      return ApiResponse.success(res, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationService.markAllAsRead(req.user!.userId);
      return ApiResponse.success(res, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
