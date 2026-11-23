import { AuditLogModel, IAuditLog } from './audit.model';
import { UserRole } from '../../config/constants';
import { Types } from 'mongoose';

export interface CreateAuditLogParams {
  userId?: Types.ObjectId | string;
  userName?: string;
  userRole?: UserRole;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  static async log(params: CreateAuditLogParams): Promise<IAuditLog> {
    return AuditLogModel.create({
      ...params,
      userId: params.userId ? new Types.ObjectId(params.userId.toString()) : undefined,
    });
  }

  static async getLogs(query: {
    page?: number;
    limit?: number;
    entityType?: string;
    action?: string;
    userId?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.entityType) filter.entityType = query.entityType;
    if (query.action) filter.action = query.action;
    if (query.userId) {
      // An id that isn't valid can't match anyone: return nothing rather than everything.
      if (!Types.ObjectId.isValid(query.userId)) {
        return { logs: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }
      filter.userId = new Types.ObjectId(query.userId);
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .populate('userId', 'name email role adminType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    return {
      logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Distinct action names, optionally limited to one user's entries. */
  static async getActions(userId?: string): Promise<string[]> {
    if (userId && !Types.ObjectId.isValid(userId)) return [];
    const filter = userId ? { userId: new Types.ObjectId(userId) } : {};
    const actions = await AuditLogModel.distinct('action', filter);
    return (actions as string[]).sort();
  }
}
