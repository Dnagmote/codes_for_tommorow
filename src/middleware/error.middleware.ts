import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/api-error';
import { ApiResponse } from '../utils/api-response';
import { env } from '../config/env.config';
import { MESSAGES, HTTP_STATUS, ERROR_CODES } from '../constants/constants';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Handled Application Errors (ApiError)
  if (err instanceof ApiError) {
    ApiResponse.error(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // 2. Request Validation Errors (ZodError)
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      MESSAGES.ERROR.VALIDATION_ERROR,
      details
    );
    return;
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'resource';
        ApiResponse.error(
          res,
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.CONFLICT,
          `Resource already exists: duplicate field on ${target}`,
          err.meta
        );
        return;
      }
      case 'P2025': {
        ApiResponse.error(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.NOT_FOUND,
          'Record not found',
          err.meta
        );
        return;
      }
      case 'P2003': {
        ApiResponse.error(
          res,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST,
          'Foreign key constraint failure',
          err.meta
        );
        return;
      }
      default:
        ApiResponse.error(
          res,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST,
          `Database error: ${err.message}`
        );
        return;
    }
  }

  // 4. Prisma Validation Errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST,
      'Database validation error'
    );
    return;
  }

  // 5. Firebase Admin / Firestore Errors
  const errAny = err as any;
  if (errAny && (typeof errAny.code === 'string' || typeof errAny.code === 'number')) {
    const codeStr = String(errAny.code).toLowerCase();
    if (codeStr.includes('permission-denied') || errAny.code === 7) {
      ApiResponse.error(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Database permission denied'
      );
      return;
    }
    if (codeStr.includes('not-found') || errAny.code === 5) {
      ApiResponse.error(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        'Requested database resource not found'
      );
      return;
    }
    if (codeStr.includes('unavailable') || errAny.code === 14) {
      ApiResponse.error(
        res,
        503,
        'SERVICE_UNAVAILABLE',
        'Database service temporarily unavailable'
      );
      return;
    }
  }

  // 6. Unhandled Internal Server Errors
  // Mask stack traces in production - never leak stack traces to client
  if (env.NODE_ENV !== 'production') {
    console.error('Unhandled Server Error:', err);
  }

  ApiResponse.error(
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    MESSAGES.ERROR.INTERNAL_SERVER_ERROR
  );
}
