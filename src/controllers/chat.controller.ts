import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import { ApiResponse } from '../utils/api-response';
import { MESSAGES, HTTP_STATUS } from '../constants/constants';

export class ChatController {
  async createChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userAId, userBId } = req.body;
      const result = await chatService.getOrCreateOneToOneChat(userAId, userBId);

      const statusCode = result.isExisting ? HTTP_STATUS.OK : HTTP_STATUS.CREATED;
      const message = result.isExisting
        ? MESSAGES.SUCCESS.CHAT_RETRIEVED
        : MESSAGES.SUCCESS.CHAT_CREATED;

      ApiResponse.success(res, result, message, statusCode);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
