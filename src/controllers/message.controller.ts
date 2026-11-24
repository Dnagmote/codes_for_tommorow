import { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service';
import { ApiResponse } from '../utils/api-response';
import { MESSAGES, HTTP_STATUS } from '../constants/constants';

export class MessageController {
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = req.params.chatId as string;
      const { senderId, text } = req.body;

      const message = await messageService.sendMessage(chatId, senderId, text);

      ApiResponse.success(
        res,
        message,
        MESSAGES.SUCCESS.MESSAGE_SENT,
        HTTP_STATUS.CREATED
      );
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = req.params.chatId as string;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const before = req.query.before as string | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await messageService.getMessages(chatId, limit, before, userId);

      ApiResponse.success(
        res,
        result,
        MESSAGES.SUCCESS.MESSAGES_RETRIEVED,
        HTTP_STATUS.OK
      );
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
