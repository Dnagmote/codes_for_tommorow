import { chatMemberRepository } from '../repositories/chat-member.repository';
import { messageRepository } from '../repositories/message.repository';
import { readReceiptRepository } from '../repositories/read-receipt.repository';
import { ApiError } from '../utils/api-error';
import { MESSAGES } from '../constants/constants';
import type { ReadReceiptResponse } from '../types/read-receipt.types';

export class ReadReceiptService {
  async markAsRead(
    chatId: string,
    messageId: string,
    userId: string
  ): Promise<ReadReceiptResponse> {
    // Step 1: Verify chat membership via PostgreSQL ChatMember repository
    const isMember = await chatMemberRepository.isUserMemberOfChat(chatId, userId);
    if (!isMember) {
      throw ApiError.forbidden(MESSAGES.ERROR.NOT_A_MEMBER);
    }

    // Step 2: Verify target message exists in Firestore
    const message = await messageRepository.getMessageById(chatId, messageId);
    if (!message) {
      throw ApiError.notFound(MESSAGES.ERROR.MESSAGE_NOT_FOUND);
    }

    // Step 3: Record read receipt in Firestore idempotently via ReadReceiptRepository
    const receipt = await readReceiptRepository.markAsRead(chatId, messageId, userId);

    return receipt;
  }
}

export const readReceiptService = new ReadReceiptService();
