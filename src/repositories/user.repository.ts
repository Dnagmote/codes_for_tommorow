import { prisma } from '../config/prisma';
import type { UserRecord } from '../types/user.types';

export class UserRepository {
  async findById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findManyByIds(ids: string[]): Promise<UserRecord[]> {
    return prisma.user.findMany({
      where: {
        id: { in: ids },
      },
    });
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async upsert(data: { id?: string; name: string; email: string }): Promise<UserRecord> {
    return prisma.user.upsert({
      where: { email: data.email },
      update: { name: data.name },
      create: {
        ...(data.id ? { id: data.id } : {}),
        name: data.name,
        email: data.email,
      },
    });
  }

  async count(): Promise<number> {
    return prisma.user.count();
  }
}

export const userRepository = new UserRepository();
