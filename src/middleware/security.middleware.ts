import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '../utils/api-response';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true',
  handler: (_req: Request, res: Response) => {
    ApiResponse.error(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many requests from this IP, please try again after 15 minutes'
    );
  },
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 message send requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true',
  handler: (_req: Request, res: Response) => {
    ApiResponse.error(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Message rate limit exceeded, please try again in a minute'
    );
  },
});
