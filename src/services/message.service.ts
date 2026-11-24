import { chatRepository } from '../repositories/chat.repository';
import { chatMemberRepository } from '../repositories/chat-member.repository';
import { messageRepository } from '../repositories/message.repository';
import { ApiError } from '../utils/api-error';
import { MESSAGES } from '../constants/constants';
import type { MessageResponse, GetMessagesResult } from '../types/message.types';

export class MessageService {
  async verifyChatMembership(chatId: string, userId: string): Promise<void> {
    const isMember = await chatMemberRepository.isUserMemberOfChat(chatId, userId);
    if (!isMember) {
      throw ApiError.forbidden(MESSAGES.ERROR.NOT_A_MEMBER);
    }
  }

  async verifyChatExists(chatId: string): Promise<void> {
    const chat = await chatRepository.findById(chatId);
    if (!chat) {
      throw ApiError.notFound(MESSAGES.ERROR.CHAT_NOT_FOUND);
    }
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    text: string
  ): Promise<MessageResponse> {
    // 1. Verify chat exists in PostgreSQL
    await this.verifyChatExists(chatId);

    // 2. Verify sender is an active member of this chat
    await this.verifyChatMembership(chatId, senderId);

    // 3. Save message in Firestore through Repository
    const message = await messageRepository.createMessage({
      chatId,
      senderId,
      text,
    });

    return message;
  }

  async getMessages(
    chatId: string,
    limit: number = 50,
    before?: string,
    userId?: string
  ): Promise<GetMessagesResult> {
    // 1. Verify chat exists in PostgreSQL
    await this.verifyChatExists(chatId);

    // 2. If userId is provided, verify membership access
    if (userId) {
      await this.verifyChatMembership(chatId, userId);
    }

    // 3. Fetch messages from Firestore through Repository
    const result = await messageRepository.getMessages(chatId, limit, before);

    return result;
  }
}

export const messageService = new MessageService();
