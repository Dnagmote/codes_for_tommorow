import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { MESSAGES } from '../constants/constants';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`${MESSAGES.ERROR.ENDPOINT_NOT_FOUND}: ${req.method} ${req.originalUrl}`));
}
