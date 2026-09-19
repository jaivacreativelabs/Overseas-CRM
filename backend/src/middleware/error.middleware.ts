import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ApiResponse } from '../utils/api-response';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  logger.error(`[Unhandled/App Error] ${req.method} ${req.originalUrl}:`, err);

  // If it's our custom AppError
  if (err instanceof AppError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.code, err.errors);
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Field';
    return ApiResponse.error(
      res,
      `${field} already exists. Please choose a unique value.`,
      409,
      'DUPLICATE_KEY_ERROR'
    );
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.error(res, `Invalid resource identifier: ${err.value}`, 400, 'INVALID_ID');
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiResponse.error(res, 'Database validation failed', 400, 'DATABASE_VALIDATION_ERROR', errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'Invalid token. Please login again.', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'Session expired. Please login again.', 401, 'TOKEN_EXPIRED');
  }

  // Default internal server error (never leak stack trace in production)
  const isProd = process.env.NODE_ENV === 'production';
  return ApiResponse.error(
    res,
    isProd ? 'Internal server error' : err.message || 'Internal server error',
    500,
    'INTERNAL_SERVER_ERROR'
  );
};
