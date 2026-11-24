import { prisma } from '../config/prisma';
import { userRepository } from '../repositories/user.repository';

async function testDatabaseConnection(): Promise<void> {
  try {
    console.log('[DB Test] Verifying database connection...');
    await prisma.$connect();
    const userCount = await userRepository.count();
    console.log(`[DB Test] Database connection successful. User count: ${userCount}.`);
    process.exit(0);
  } catch (error) {
    console.error('[DB Test] Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void testDatabaseConnection();
