import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { userChatService } from '../services/user-chat.service';
import { ApiResponse } from '../utils/api-response';
import { MESSAGES, HTTP_STATUS } from '../constants/constants';

export class UserController {
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email } = req.body;
      const user = await userService.createUser({ name, email });
      ApiResponse.success(res, user, MESSAGES.SUCCESS.USER_CREATED, HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async getUserChats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const chats = await userChatService.getUserChats(userId);
      ApiResponse.success(res, chats, MESSAGES.SUCCESS.CHATS_RETRIEVED, HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
