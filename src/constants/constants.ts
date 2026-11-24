import messages from '../locales/en.json';

export const MESSAGES = messages;

export const CHAT_TYPES = {
  ONE_TO_ONE: 'ONE_TO_ONE',
  GROUP: 'GROUP',
} as const;

export const MEMBER_ROLES = {
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export const FirestoreCollections = {
  CHATS: 'chats',
  MESSAGES: 'messages',
  READS: 'reads',
  LAST_SEEN: 'lastSeen',
} as const;

export const firestorePaths = {
  chatMessagesCollection: (chatId: string): string => `chats/${chatId}/messages`,
  messageDoc: (chatId: string, messageId: string): string => `chats/${chatId}/messages/${messageId}`,
  messageReadsCollection: (chatId: string, messageId: string): string =>
    `chats/${chatId}/messages/${messageId}/reads`,
  messageReadDoc: (chatId: string, messageId: string, userId: string): string =>
    `chats/${chatId}/messages/${messageId}/reads/${userId}`,
  chatLastSeenCollection: (chatId: string): string => `chats/${chatId}/lastSeen`,
  chatLastSeenDoc: (chatId: string, userId: string): string => `chats/${chatId}/lastSeen/${userId}`,
};
