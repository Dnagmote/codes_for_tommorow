import { userRepository } from '../repositories/user.repository';
import { chatRepository } from '../repositories/chat.repository';
import { ApiError } from '../utils/api-error';
import { MESSAGES } from '../constants/constants';
import type { ChatResponse, ChatMemberRecord } from '../types/chat.types';

export class ChatService {
  async getOrCreateOneToOneChat(userAId: string, userBId: string): Promise<ChatResponse> {
    if (userAId === userBId) {
      throw ApiError.badRequest(MESSAGES.ERROR.SELF_CHAT);
    }

    // Step 1: Validate both users exist via UserRepository
    const users = await userRepository.findManyByIds([userAId, userBId]);
    if (users.length < 2) {
      const foundIds = users.map((u) => u.id);
      const missing = [userAId, userBId].filter((id) => !foundIds.includes(id));
      throw ApiError.notFound(`${MESSAGES.ERROR.USER_NOT_FOUND}: ${missing.join(', ')}`);
    }

    // Step 2: Check for existing 1-to-1 chat via ChatRepository
    const existingChat = await chatRepository.findExistingOneToOneChat(userAId, userBId);
    if (existingChat) {
      return {
        chatId: existingChat.id,
        type: existingChat.type,
        isExisting: true,
        members: existingChat.members.map((m: ChatMemberRecord) => ({
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        })),
        createdAt: existingChat.createdAt.toISOString(),
      };
    }

    // Step 3: Atomic creation via ChatRepository
    const result = await chatRepository.createOneToOneChat(userAId, userBId);

    return {
      chatId: result.chat.id,
      type: result.chat.type,
      isExisting: result.isExisting,
      members: result.chat.members.map((m: ChatMemberRecord) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
      createdAt: result.chat.createdAt.toISOString(),
    };
  }
}

export const chatService = new ChatService();
