import { userRepository } from '../repositories/user.repository';
import type { UserRecord, CreateUserInput } from '../types/user.types';

export class UserService {
  async createUser(input: CreateUserInput): Promise<UserRecord> {
    return userRepository.upsert({
      name: input.name,
      email: input.email,
    });
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    return userRepository.findById(id);
  }
}

export const userService = new UserService();
