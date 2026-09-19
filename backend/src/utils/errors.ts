export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly errors?: any[];

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden for your role or permissions', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors?: any[], code = 'VALIDATION_ERROR') {
    super(message, 400, code, errors);
  }
}

export class StageLockedError extends AppError {
  constructor(message: string, missingRequirements?: string[]) {
    super(message, 400, 'STAGE_LOCKED', missingRequirements);
  }
}

export class OwnerAdminProtectionError extends AppError {
  constructor(message = 'Owner Admin cannot be modified, demoted, deactivated, or deleted.') {
    super(message, 403, 'OWNER_ADMIN_PROTECTED');
  }
}
