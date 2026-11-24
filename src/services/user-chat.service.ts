import { userRepository } from '../repositories/user.repository';
import { chatRepository } from '../repositories/chat.repository';
import { messageRepository } from '../repositories/message.repository';
import { lastSeenRepository } from '../repositories/last-seen.repository';
import { ApiError } from '../utils/api-error';
import { MESSAGES } from '../constants/constants';
import type { UserChatListItem } from '../types/user-chat.types';

export class UserChatService {
  async getUserChats(userId: string): Promise<UserChatListItem[]> {
    // Step 1: Verify user exists in PostgreSQL
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound(MESSAGES.ERROR.USER_NOT_FOUND);
    }

    // Step 2: Query PostgreSQL for all chats where members include userId
    const chats = await chatRepository.getUserChats(userId);

    // Step 3: For each chat, fetch latest message & lastSeen state from Firestore concurrently
    const chatListItems: UserChatListItem[] = await Promise.all(
      chats.map(async (chat) => {
        const [latestMessage, lastSeen] = await Promise.all([
          messageRepository.getLatestMessage(chat.id),
          lastSeenRepository.getLastSeen(chat.id, userId),
        ]);

        return {
          chatId: chat.id,
          type: chat.type,
          name: chat.name,
          createdAt: chat.createdAt.toISOString(),
          updatedAt: chat.updatedAt.toISOString(),
          members: chat.members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
          })),
          lastMessage: latestMessage
            ? {
                id: latestMessage.id,
                senderId: latestMessage.senderId,
                text: latestMessage.text,
                createdAt: latestMessage.createdAt,
              }
            : null,
          lastSeen: lastSeen
            ? {
                messageId: lastSeen.lastSeenMessageId,
                updatedAt: lastSeen.updatedAt,
              }
            : null,
        };
      })
    );

    return chatListItems;
  }
}

export const userChatService = new UserChatService();
