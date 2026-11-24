import { z } from 'zod';
import { MESSAGES } from '../constants/constants';

export const sendMessageSchema = z.object({
  params: z.object({
    chatId: z.string().uuid(MESSAGES.VALIDATION.CHAT_ID_REQUIRED),
  }),
  body: z.object({
    senderId: z
      .string({ required_error: MESSAGES.VALIDATION.SENDER_REQUIRED })
      .min(1, MESSAGES.VALIDATION.SENDER_REQUIRED),
    text: z
      .string({ required_error: MESSAGES.VALIDATION.MESSAGE_TEXT_REQUIRED })
      .trim()
      .min(1, MESSAGES.VALIDATION.MESSAGE_TEXT_REQUIRED)
      .max(5000, MESSAGES.VALIDATION.MESSAGE_TEXT_MAX),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    chatId: z.string().uuid(MESSAGES.VALIDATION.CHAT_ID_REQUIRED),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    before: z.string().optional(),
    userId: z.string().optional(),
  }),
});

export type SendMessageParams = z.infer<typeof sendMessageSchema>['params'];
export type SendMessageBody = z.infer<typeof sendMessageSchema>['body'];
export type GetMessagesParams = z.infer<typeof getMessagesSchema>['params'];
export type GetMessagesQuery = z.infer<typeof getMessagesSchema>['query'];
