import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { messageController } from '../controllers/message.controller';
import { readReceiptController } from '../controllers/read-receipt.controller';
import { lastSeenController } from '../controllers/last-seen.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { messageLimiter } from '../middleware/security.middleware';
import { createChatSchema } from '../validations/chat.validation';
import {
  sendMessageSchema,
  getMessagesSchema,
} from '../validations/message.validation';
import { markMessageAsReadSchema } from '../validations/read-receipt.validation';
import { updateLastSeenSchema } from '../validations/last-seen.validation';

const router = Router();

// POST /chat/create
router.post('/create', validateRequest(createChatSchema), chatController.createChat);

// POST /chat/:chatId/message/send
router.post(
  '/:chatId/message/send',
  messageLimiter,
  validateRequest(sendMessageSchema),
  messageController.sendMessage
);

// GET /chat/:chatId/messages
router.get(
  '/:chatId/messages',
  validateRequest(getMessagesSchema),
  messageController.getMessages
);

// POST /chat/:chatId/message/:messageId/read
router.post(
  '/:chatId/message/:messageId/read',
  validateRequest(markMessageAsReadSchema),
  readReceiptController.markAsRead
);

// POST /chat/:chatId/lastseen
router.post(
  '/:chatId/lastseen',
  validateRequest(updateLastSeenSchema),
  lastSeenController.updateLastSeen
);

export default router;
