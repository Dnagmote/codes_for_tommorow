import { prisma } from '../config/prisma';
import { MEMBER_ROLES } from '../constants/constants';
import type { ChatMemberRecord } from '../types/chat.types';

export class ChatMemberRepository {
  async isUserMemberOfChat(chatId: string, userId: string): Promise<boolean> {
    const count = await prisma.chatMember.count({
      where: { chatId, userId },
    });
    return count > 0;
  }

  async getChatMember(chatId: string, userId: string): Promise<ChatMemberRecord | null> {
    const member = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: { chatId, userId },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return member as ChatMemberRecord | null;
  }

  async getMembersByChatId(chatId: string): Promise<ChatMemberRecord[]> {
    const members = await prisma.chatMember.findMany({
      where: { chatId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return members as ChatMemberRecord[];
  }

  async addMember(chatId: string, userId: string, role: string = MEMBER_ROLES.MEMBER): Promise<ChatMemberRecord> {
    const member = await prisma.chatMember.create({
      data: {
        chatId,
        userId,
        role: role as any,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return member as ChatMemberRecord;
  }

  async removeMember(chatId: string, userId: string): Promise<void> {
    await prisma.chatMember.delete({
      where: {
        chatId_userId: { chatId, userId },
      },
    });
  }
}

export const chatMemberRepository = new ChatMemberRepository();
