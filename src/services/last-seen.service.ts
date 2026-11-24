import { chatMemberRepository } from '../repositories/chat-member.repository';
import { messageRepository } from '../repositories/message.repository';
import { lastSeenRepository } from '../repositories/last-seen.repository';
import { ApiError } from '../utils/api-error';
import { MESSAGES } from '../constants/constants';
import type { LastSeenResponse } from '../types/last-seen.types';

export class LastSeenService {
  async updateLastSeen(
    chatId: string,
    userId: string,
    messageId: string
  ): Promise<LastSeenResponse> {
    // Step 1: Verify chat membership in PostgreSQL via Prisma ChatMember repository
    const isMember = await chatMemberRepository.isUserMemberOfChat(chatId, userId);
    if (!isMember) {
      throw ApiError.forbidden(MESSAGES.ERROR.NOT_A_MEMBER);
    }

    // Step 2: Verify target message exists in Firestore
    const message = await messageRepository.getMessageById(chatId, messageId);
    if (!message) {
      throw ApiError.notFound(MESSAGES.ERROR.MESSAGE_NOT_FOUND);
    }

    // Step 3: Write/Upsert last seen pointer in Firestore
    const result = await lastSeenRepository.updateLastSeen(chatId, userId, messageId);

    return result;
  }

  async getLastSeen(
    chatId: string,
    userId: string
  ): Promise<LastSeenResponse | null> {
    return lastSeenRepository.getLastSeen(chatId, userId);
  }
}

export const lastSeenService = new LastSeenService();
