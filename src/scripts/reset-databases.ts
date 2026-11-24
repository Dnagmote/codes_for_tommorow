import { prisma } from '../config/prisma';
import { db } from '../config/firebase';

async function resetDatabases(): Promise<void> {
  console.log('==================================================');
  console.log('RESETTING BOTH DATABASES (PostgreSQL & Firestore)');
  console.log('==================================================\n');

  try {
    // 1. Reset PostgreSQL tables
    console.log('[1/4] Clearing PostgreSQL tables...');
    await prisma.chatMember.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.user.deleteMany();
    console.log('✔ PostgreSQL tables cleared successfully.\n');

    // 2. Reset Cloud Firestore collections
    console.log('[2/4] Clearing Google Cloud Firestore collections...');
    const chatsCollection = db.collection('chats');
    await db.recursiveDelete(chatsCollection);
    
    // Also clean temporary health check docs if any
    const healthCollection = db.collection('_health_check');
    await db.recursiveDelete(healthCollection);
    console.log('✔ Firestore collections cleared successfully.\n');

    // 3. Seed Fresh Initial Test Users
    console.log('[3/4] Seeding fresh initial test users...');
    const alice = await prisma.user.create({
      data: {
        name: 'Alice Sharma',
        email: 'alice@example.com',
      },
    });

    const bob = await prisma.user.create({
      data: {
        name: 'Bob Verma',
        email: 'bob@example.com',
      },
    });

    const charlie = await prisma.user.create({
      data: {
        name: 'Charlie Patel',
        email: 'charlie@example.com',
      },
    });
    console.log('✔ Fresh users created successfully!\n');

    // 4. Print Summary and IDs
    console.log('==================================================');
    console.log('DATABASE RESET & SEED COMPLETE');
    console.log('==================================================');
    console.log('Use these seeded user IDs for your manual API tests:\n');
    console.log(`• Alice ID   (User A) : ${alice.id}`);
    console.log(`• Bob ID     (User B) : ${bob.id}`);
    console.log(`• Charlie ID (User C) : ${charlie.id}\n`);
    console.log('==================================================');

  } catch (error) {
    console.error('Error resetting databases:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabases();
