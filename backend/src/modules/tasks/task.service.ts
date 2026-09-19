import { Types } from 'mongoose';
import { TaskModel, ITask } from './task.model';
import { UserModel } from '../users/user.model';
import { TaskPriority, TaskStatus, TaskType, UserRole } from '../../config/constants';
import { NotFoundError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { ActivityService } from '../activities/activity.service';

export class TaskService {
  static async getTasks(query: {
    page?: number;
    limit?: number;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    assignedTo?: string;
    leadId?: string;
    isOverdue?: boolean;
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.type) filter.type = query.type;
    if (query.assignedTo) filter.assignedTo = new Types.ObjectId(query.assignedTo);
    if (query.leadId) filter.leadId = new Types.ObjectId(query.leadId);

    if (query.isOverdue) {
      filter.status = { $ne: TaskStatus.COMPLETED };
      filter.dueDate = { $lt: new Date() };
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { assignedToName: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      TaskModel.find(filter)
        .populate('leadId', 'name email phone stage targetCountry')
        .populate('assignedTo', 'name email avatar')
        .sort({ dueDate: 1, priority: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TaskModel.countDocuments(filter),
    ]);

    return {
      tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createTask(
    data: {
      title: string;
      description?: string;
      type?: TaskType;
      leadId?: string;
      assignedTo: string;
      dueDate: string;
      priority?: TaskPriority;
    },
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<ITask> {
    const assignee = await UserModel.findById(data.assignedTo);
    const assignedToName = assignee ? assignee.name : actorName;

    const task = await TaskModel.create({
      title: data.title,
      description: data.description,
      type: data.type || TaskType.OPERATIONAL,
      leadId: data.leadId ? new Types.ObjectId(data.leadId) : undefined,
      assignedTo: new Types.ObjectId(data.assignedTo),
      assignedToName,
      dueDate: new Date(data.dueDate),
      priority: data.priority || TaskPriority.MEDIUM,
      status: TaskStatus.PENDING,
      createdBy: new Types.ObjectId(actorUserId),
      createdByName: actorName,
    });

    if (data.leadId) {
      await ActivityService.log({
        leadId: data.leadId,
        actorId: actorUserId,
        actorName,
        actorRole,
        action: 'TASK_CREATED',
        title: 'Task Created',
        description: `Task assigned to ${assignedToName}: ${task.title} (Due: ${new Date(data.dueDate).toLocaleDateString()})`,
      });
    }

    return task;
  }

  static async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    actorUserId: string,
    actorName: string,
    actorRole: UserRole
  ): Promise<ITask> {
    const task = await TaskModel.findById(taskId);
    if (!task) throw new NotFoundError('Task not found');

    const beforeState = task.toObject();

    task.status = status;
    if (status === TaskStatus.COMPLETED) {
      task.completionDate = new Date();
    } else {
      task.completionDate = undefined;
    }

    await task.save();

    await AuditService.log({
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      action: 'UPDATE_TASK_STATUS',
      entityType: 'Task',
      entityId: taskId,
      before: beforeState,
      after: task.toObject(),
    });

    return task;
  }
}
