import { Router, Request, Response } from 'express';
import { ApiResponse } from '../utils/api-response';
import { env } from '../config/env.config';
import { MESSAGES } from '../constants/constants';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const healthData = {
    status: 'ok',
    uptime: Math.round(process.uptime() * 100) / 100,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  };

  ApiResponse.success(res, healthData, MESSAGES.SUCCESS.HEALTH_CHECK);
});

export default router;
