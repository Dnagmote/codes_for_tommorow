import { z } from 'zod';
import { MESSAGES } from '../constants/constants';

export const createUserSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: MESSAGES.VALIDATION.NAME_REQUIRED })
      .trim()
      .min(1, MESSAGES.VALIDATION.NAME_EMPTY),
    email: z
      .string({ required_error: MESSAGES.VALIDATION.EMAIL_REQUIRED })
      .trim()
      .email(MESSAGES.VALIDATION.INVALID_EMAIL),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];

export const getUserChatsSchema = z.object({
  params: z.object({
    userId: z
      .string({ required_error: MESSAGES.VALIDATION.USER_ID_REQUIRED })
      .min(1, MESSAGES.VALIDATION.USER_ID_REQUIRED),
  }),
});

export type GetUserChatsParams = z.infer<typeof getUserChatsSchema>['params'];

