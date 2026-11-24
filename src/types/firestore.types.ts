import type { Timestamp } from 'firebase-admin/firestore';

export interface FirestoreMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface FirestoreReadReceipt {
  userId: string;
  readAt: Timestamp;
}

export interface FirestoreLastSeen {
  userId: string;
  messageId: string;
  updatedAt: Timestamp;
}
