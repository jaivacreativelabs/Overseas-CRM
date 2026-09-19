import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { UserRole, AdminType } from '../config/constants';

/**
 * Ensures user has at least one of the allowed roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User is not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Action not allowed for role: ${req.user.role}. Required: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Ensures only Admin / Owner Admin can perform action
 */
export const requireAdmin = authorize(UserRole.ADMIN);

/**
 * Ensures only Staff (Admin or Counsellor) can perform action
 */
export const requireStaff = authorize(UserRole.ADMIN, UserRole.COUNSELLOR);

/**
 * Ensures only Student can perform action
 */
export const requireStudent = authorize(UserRole.STUDENT);

/**
 * Middleware to check student self-access (cannot access other student's data)
 */
export const enforceStudentIsolation = (paramName = 'studentId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Admins and Counsellors have global access to all students
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.COUNSELLOR) {
      return next();
    }

    // For students, check that param/body matches their own studentId
    if (req.user.role === UserRole.STUDENT) {
      const requestedStudentId = req.params[paramName] || req.body[paramName] || req.query[paramName];
      if (requestedStudentId && requestedStudentId !== req.user.studentId && requestedStudentId !== req.user.userId) {
        throw new ForbiddenError('Students are restricted to accessing their own profile and records only.');
      }
    }

    next();
  };
};
