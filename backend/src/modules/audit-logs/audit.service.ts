import { AuditLogModel, IAuditLog } from './audit.model';
import { UserRole } from '../../config/constants';
import { Types } from 'mongoose';
import { BranchModel } from '../branches/branch.model';
import { UserModel } from '../users/user.model';

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
    branchId?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const empty = { logs: [], meta: { page, limit, total: 0, totalPages: 0 } };
    const filter: Record<string, any> = {};
    if (query.entityType) filter.entityType = query.entityType;
    if (query.action) filter.action = query.action;
    if (query.userId) {
      // An id that isn't valid can't match anyone: return nothing rather than everything.
      if (!Types.ObjectId.isValid(query.userId)) return empty;
      filter.userId = new Types.ObjectId(query.userId);
    }
    if (query.branchId) {
      const branchUserIds = await AuditService.getBranchUserIds(query.branchId);
      if (filter.userId) {
        // Both filters given: keep the user only if they belong to the branch.
        if (!branchUserIds.some((id) => id.equals(filter.userId))) return empty;
      } else {
        filter.userId = { $in: branchUserIds };
      }
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

  /**
   * People whose actions count as a branch's activity: the staff assigned on the branch's Staff tab,
   * its manager (matched by the branch's manager email), and any account linked to the branch
   * directly (students assigned to it, for example).
   */
  static async getBranchUserIds(branchId: string): Promise<Types.ObjectId[]> {
    if (!Types.ObjectId.isValid(branchId)) return [];
    const branch = await BranchModel.findById(branchId).select('assignedStaffIds managerEmail').lean();
    if (!branch) return [];

    const or: Record<string, any>[] = [{ branchId: branch._id }];
    if (branch.assignedStaffIds?.length) or.push({ _id: { $in: branch.assignedStaffIds } });
    if (branch.managerEmail) or.push({ email: branch.managerEmail.toLowerCase().trim() });

    return (await UserModel.distinct('_id', { $or: or })) as Types.ObjectId[];
  }

  /** Distinct action names, optionally limited to one user's entries. */
  static async getActions(userId?: string): Promise<string[]> {
    if (userId && !Types.ObjectId.isValid(userId)) return [];
    const filter = userId ? { userId: new Types.ObjectId(userId) } : {};
    const actions = await AuditLogModel.distinct('action', filter);
    return (actions as string[]).sort();
  }
}
