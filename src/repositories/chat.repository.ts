import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { CHAT_TYPES, MEMBER_ROLES } from '../constants/constants';
import type { ChatRecordWithMembers } from '../types/chat.types';

export class ChatRepository {
  async findExistingOneToOneChat(userAId: string, userBId: string): Promise<ChatRecordWithMembers | null> {
    const chat = await prisma.chat.findFirst({
      where: {
        type: CHAT_TYPES.ONE_TO_ONE,
        AND: [
          { members: { some: { userId: userAId } } },
          { members: { some: { userId: userBId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return chat as ChatRecordWithMembers | null;
  }

  async createOneToOneChat(
    userAId: string,
    userBId: string
  ): Promise<{ chat: ChatRecordWithMembers; isExisting: boolean }> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Concurrency double-check
      const existing = await tx.chat.findFirst({
        where: {
          type: CHAT_TYPES.ONE_TO_ONE,
          AND: [
            { members: { some: { userId: userAId } } },
            { members: { some: { userId: userBId } } },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      if (existing) {
        return { chat: existing as ChatRecordWithMembers, isExisting: true };
      }

      const created = await tx.chat.create({
        data: {
          type: CHAT_TYPES.ONE_TO_ONE,
          members: {
            create: [
              { userId: userAId, role: MEMBER_ROLES.MEMBER },
              { userId: userBId, role: MEMBER_ROLES.MEMBER },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      return { chat: created as ChatRecordWithMembers, isExisting: false };
    }, {
      maxWait: 10000,
      timeout: 20000,
    });
  }

  async findById(chatId: string): Promise<ChatRecordWithMembers | null> {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return chat as ChatRecordWithMembers | null;
  }

  async deleteChat(chatId: string): Promise<void> {
    await prisma.chat.delete({
      where: { id: chatId },
    });
  }

  async getUserChats(userId: string): Promise<ChatRecordWithMembers[]> {
    const chatMembers = await prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        chat: {
          updatedAt: 'desc',
        },
      },
    });

    return chatMembers.map((cm) => cm.chat as unknown as ChatRecordWithMembers);
  }
}

export const chatRepository = new ChatRepository();
