import { z } from 'zod';
import { MESSAGES } from '../constants/constants';

export const markMessageAsReadSchema = z.object({
  params: z.object({
    chatId: z.string().uuid(MESSAGES.VALIDATION.CHAT_ID_REQUIRED),
    messageId: z
      .string({ required_error: MESSAGES.VALIDATION.MESSAGE_ID_REQUIRED })
      .min(1, MESSAGES.VALIDATION.MESSAGE_ID_REQUIRED),
  }),
  body: z.object({
    userId: z
      .string({ required_error: MESSAGES.VALIDATION.USER_ID_REQUIRED })
      .min(1, MESSAGES.VALIDATION.USER_ID_REQUIRED),
  }),
});

export type MarkMessageAsReadParams = z.infer<typeof markMessageAsReadSchema>['params'];
export type MarkMessageAsReadBody = z.infer<typeof markMessageAsReadSchema>['body'];
