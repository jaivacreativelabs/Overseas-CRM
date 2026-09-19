import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../users/user.model';
import { env } from '../../config/env';
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { AuditService } from '../audit-logs/audit.service';
import { JwtPayload } from '../../middleware/auth.middleware';

export class AuthService {
  static async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; user: Partial<IUser> }> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive || user.isArchived) {
      throw new ForbiddenError('Your account has been deactivated or archived. Please contact administration.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      adminType: user.adminType,
      studentId: user.role === 'STUDENT' ? user._id.toString() : undefined,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    await AuditService.log({
      userId: user._id.toString(),
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'Auth',
      entityId: user._id.toString(),
      ipAddress,
      userAgent,
    });

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    return { token, user: userObj };
  }

  static async getCurrentUser(userId: string): Promise<Partial<IUser>> {
    const user = await UserModel.findById(userId).select('-passwordHash').populate('assignedCounsellorId', 'name email phone avatar');
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }
}
