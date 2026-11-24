export interface LastSeenResponse {
  chatId: string;
  userId: string;
  lastSeenMessageId: string;
  updatedAt: string;
}

export interface UpdateLastSeenData {
  chatId: string;
  userId: string;
  messageId: string;
}
