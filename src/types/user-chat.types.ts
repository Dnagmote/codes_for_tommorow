import type { ChatMemberResponse } from './chat.types';

export interface LatestMessagePreview {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface LastSeenPreview {
  messageId: string;
  updatedAt: string;
}

export interface UserChatListItem {
  chatId: string;
  type: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  members: ChatMemberResponse[];
  lastMessage: LatestMessagePreview | null;
  lastSeen: LastSeenPreview | null;
}
