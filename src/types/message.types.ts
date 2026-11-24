import type { Timestamp } from 'firebase-admin/firestore';

export interface MessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
  isDeleted: boolean;
}

export interface GetMessagesResult {
  messages: MessageResponse[];
  count: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface CreateMessageData {
  chatId: string;
  senderId: string;
  text: string;
}

export interface GetMessagesQueryOptions {
  limit: number;
  before?: string;
}
