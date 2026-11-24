export interface ChatMemberUser {
  id: string;
  name: string;
  email: string;
}

export interface ChatMemberRecord {
  id: string;
  chatId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  user: ChatMemberUser;
}

export interface ChatRecordWithMembers {
  id: string;
  type: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: ChatMemberRecord[];
}

export interface ChatMemberResponse {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface ChatResponse {
  chatId: string;
  type: string;
  isExisting: boolean;
  members: ChatMemberResponse[];
  createdAt: string;
}
