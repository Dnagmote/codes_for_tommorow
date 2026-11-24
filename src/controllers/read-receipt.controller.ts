import { Request, Response, NextFunction } from 'express';
import { readReceiptService } from '../services/read-receipt.service';
import { ApiResponse } from '../utils/api-response';
import { MESSAGES, HTTP_STATUS } from '../constants/constants';

export class ReadReceiptController {
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = req.params.chatId as string;
      const messageId = req.params.messageId as string;
      const { userId } = req.body;

      const receipt = await readReceiptService.markAsRead(chatId, messageId, userId);

      ApiResponse.success(
        res,
        receipt,
        MESSAGES.SUCCESS.MESSAGE_READ,
        HTTP_STATUS.OK
      );
    } catch (error) {
      next(error);
    }
  }
}

export const readReceiptController = new ReadReceiptController();
