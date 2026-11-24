import bcrypt from 'bcryptjs';
import { UserModel, IUser } from './user.model';
import { UserRole, AdminType } from '../../config/constants';
import {
  NotFoundError,
  OwnerAdminProtectionError,
  ValidationError,
  ForbiddenError,
} from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { Types } from 'mongoose';

export class UserService {
  static async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    adminType?: AdminType;
    actorUserId?: string;
    actorRole?: UserRole;
  }): Promise<IUser> {
    const existing = await UserModel.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ValidationError('A user with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await UserModel.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      phone: data.phone,
      role: data.role,
      adminType: data.role === UserRole.ADMIN ? (data.adminType || AdminType.ADMIN) : undefined,
      isActive: true,
    });

    if (data.actorUserId) {
      await AuditService.log({
        userId: data.actorUserId,
        userRole: data.actorRole,
        action: 'CREATE_USER',
        entityType: 'User',
        entityId: user._id.toString(),
        after: { name: user.name, email: user.email, role: user.role },
      });
    }

    return user;
  }

  static async getUsers(query: {
    page?: number;
    limit?: number;
    role?: UserRole;
    search?: string;
    isActive?: boolean;
    /** Only admins and counsellors: leaves out student portal accounts. */
    staffOnly?: boolean;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isArchived: false };
    if (query.role) filter.role = query.role;
    else if (query.staffOnly) filter.role = { $in: [UserRole.ADMIN, UserRole.COUNSELLOR] };
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return {
      users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserById(id: string): Promise<IUser> {
    const user = await UserModel.findById(id).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  static async updateUser(
    id: string,
    updates: Partial<IUser> & { password?: string },
    actorUserId?: string,
    actorRole?: UserRole
  ): Promise<IUser> {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const roleChanging = !!updates.role && updates.role !== user.role;

    // Owner Admin Protection
    if (user.adminType === AdminType.OWNER_ADMIN) {
      if (roleChanging) {
        throw new OwnerAdminProtectionError('Owner Admin cannot be demoted or have role modified.');
      }
      if (updates.isActive === false) {
        throw new OwnerAdminProtectionError('Owner Admin cannot be deactivated.');
      }
    }

    // Students are managed from the Students page; only staff roles can be switched here.
    if (roleChanging && user.role === UserRole.STUDENT) {
      throw new ValidationError('A student account cannot be given a staff role.');
    }

    // Nobody can lock themselves out by changing their own role or deactivating their own account.
    if (actorUserId && actorUserId === user._id.toString()) {
      if (roleChanging) throw new ForbiddenError('You cannot change your own role.');
      if (updates.isActive === false) throw new ForbiddenError('You cannot deactivate your own account.');
    }

    // Audit entries never carry the password hash.
    const { passwordHash: _beforeHash, ...beforeState } = user.toObject();

    if (updates.email) {
      const email = updates.email.toLowerCase().trim();
      if (email !== user.email) {
        const taken = await UserModel.exists({ email, _id: { $ne: user._id } });
        if (taken) throw new ValidationError('A user with this email address already exists.');
        user.email = email;
      }
    }

    if (updates.name) user.name = updates.name;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    if (updates.avatar) user.avatar = updates.avatar;
    if (roleChanging) {
      user.role = updates.role as UserRole;
      user.adminType = user.role === UserRole.ADMIN ? AdminType.ADMIN : undefined;
    }
    if (updates.password) {
      user.passwordHash = await bcrypt.hash(updates.password, await bcrypt.genSalt(10));
    }

    await user.save();

    const { passwordHash: _afterHash, ...afterState } = user.toObject();

    if (actorUserId) {
      await AuditService.log({
        userId: actorUserId,
        userRole: actorRole,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: user._id.toString(),
        before: beforeState,
        after: { ...afterState, ...(updates.password ? { passwordReset: true } : {}) },
      });
    }

    return afterState as unknown as IUser;
  }

  static async deleteUser(id: string, actorUserId?: string, actorRole?: UserRole): Promise<void> {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Owner Admin Protection
    if (user.adminType === AdminType.OWNER_ADMIN) {
      throw new OwnerAdminProtectionError('Owner Admin cannot be deleted.');
    }

    await UserModel.findByIdAndDelete(id);

    if (actorUserId) {
      await AuditService.log({
        userId: actorUserId,
        userRole: actorRole,
        action: 'DELETE_USER',
        entityType: 'User',
        entityId: id,
        before: user.toObject(),
      });
    }
  }

  static async getCounsellors(): Promise<any[]> {
    return UserModel.find({ role: UserRole.COUNSELLOR, isActive: true, isArchived: false })
      .select('name email phone avatar')
      .lean();
  }
}
