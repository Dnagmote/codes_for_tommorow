import { z } from 'zod';
import { MESSAGES } from '../constants/constants';

export const createChatSchema = z.object({
  body: z
    .object({
      userAId: z
        .string({ required_error: MESSAGES.VALIDATION.USER_A_REQUIRED })
        .min(1, MESSAGES.VALIDATION.USER_A_EMPTY),
      userBId: z
        .string({ required_error: MESSAGES.VALIDATION.USER_B_REQUIRED })
        .min(1, MESSAGES.VALIDATION.USER_B_EMPTY),
    })
    .refine((data) => data.userAId !== data.userBId, {
      message: MESSAGES.ERROR.SELF_CHAT,
      path: ['userBId'],
    }),
});

export type CreateChatInput = z.infer<typeof createChatSchema>['body'];
