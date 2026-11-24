export interface ReadReceiptResponse {
  chatId: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface MarkAsReadData {
  chatId: string;
  messageId: string;
  userId: string;
}
