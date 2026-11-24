import { Request, Response, NextFunction } from 'express';
import { lastSeenService } from '../services/last-seen.service';
import { ApiResponse } from '../utils/api-response';
import { MESSAGES, HTTP_STATUS } from '../constants/constants';

export class LastSeenController {
  async updateLastSeen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = req.params.chatId as string;
      const { userId, messageId } = req.body;

      const result = await lastSeenService.updateLastSeen(chatId, userId, messageId);

      ApiResponse.success(
        res,
        result,
        MESSAGES.SUCCESS.LAST_SEEN_UPDATED,
        HTTP_STATUS.OK
      );
    } catch (error) {
      next(error);
    }
  }
}

export const lastSeenController = new LastSeenController();
