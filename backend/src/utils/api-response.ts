import { Response } from 'express';

export interface ApiResponseData<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  errors?: any[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export class ApiResponse {
  static success<T>(res: Response, message = 'Operation successful', data?: T, statusCode = 200, meta?: any): Response {
    const responseBody: ApiResponseData<T> = {
      success: true,
      message,
      ...(data !== undefined ? { data } : {}),
      ...(meta !== undefined ? { meta } : {}),
    };
    return res.status(statusCode).json(responseBody);
  }

  static created<T>(res: Response, message = 'Resource created successfully', data?: T, meta?: any): Response {
    return ApiResponse.success(res, message, data, 201, meta);
  }

  static error(res: Response, message = 'An error occurred', statusCode = 400, code = 'ERROR', errors?: any[]): Response {
    const responseBody: ApiResponseData = {
      success: false,
      message,
      code,
      ...(errors ? { errors } : {}),
    };
    return res.status(statusCode).json(responseBody);
  }
}
