import { Response } from 'express';

export interface ApiResponseData<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorData {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiResponse {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200): Response {
    const payload: ApiResponseData<T> = {
      success: true,
      data,
      ...(message ? { message } : {}),
    };
    return res.status(statusCode).json(payload);
  }

  static error(res: Response, statusCode: number, code: string, message: string, details?: unknown): Response {
    const payload: ApiErrorData = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    };
    return res.status(statusCode).json(payload);
  }
}
