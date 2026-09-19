import { Request, Response, NextFunction } from 'express';
import { MessageService } from './message.service';
import { ApiResponse } from '../../utils/api-response';
import { UserRole } from '../../config/constants';

export class MessageController {
  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const isStudent = req.user?.role === UserRole.STUDENT;
      const messages = await MessageService.getMessages(req.params.leadId, isStudent);
      return ApiResponse.success(res, 'Messages retrieved', messages);
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await MessageService.sendMessage(
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'User',
        req.user!.role
      );
      return ApiResponse.created(res, 'Message sent successfully', message);
    } catch (error) {
      next(error);
    }
  }

  static async editInternalNote(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await MessageService.editInternalNote(
        req.params.id,
        req.body.content,
        req.user!.role
      );
      return ApiResponse.success(res, 'Internal note updated', message);
    } catch (error) {
      next(error);
    }
  }
}
