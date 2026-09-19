import { Request, Response, NextFunction } from 'express';
import { TaskService } from './task.service';
import { ApiResponse } from '../../utils/api-response';
import { TaskPriority, TaskStatus, TaskType } from '../../config/constants';

export class TaskController {
  static async getTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const status = req.query.status as TaskStatus;
      const priority = req.query.priority as TaskPriority;
      const type = req.query.type as TaskType;
      const assignedTo = req.query.assignedTo as string;
      const leadId = req.query.leadId as string;
      const isOverdue = req.query.isOverdue === 'true';
      const search = req.query.search as string;

      const result = await TaskService.getTasks({
        page,
        limit,
        status,
        priority,
        type,
        assignedTo,
        leadId,
        isOverdue,
        search,
      });

      return ApiResponse.success(res, 'Tasks retrieved', result.tasks, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await TaskService.createTask(
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Task created successfully', task);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await TaskService.updateTaskStatus(
        req.params.id,
        req.body.status as TaskStatus,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Task status updated', task);
    } catch (error) {
      next(error);
    }
  }
}
