import { prisma } from '../config/prisma';
import { userRepository } from '../repositories/user.repository';
import { chatRepository } from '../repositories/chat.repository';
import { messageRepository } from '../repositories/message.repository';
import { lastSeenRepository } from '../repositories/last-seen.repository';
import app from '../app';
import http from 'http';

interface TestResponse<T = any> {
  status: number;
  data: T;
}

async function request(
  server: http.Server,
  path: string,
  method: string,
  body?: any
): Promise<TestResponse> {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;

  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode || 500, data: parsed });
          } catch {
            resolve({ status: res.statusCode || 500, data: responseBody as any });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runPhase7Tests(): Promise<void> {
  console.log('[Phase 7 Test] Starting integration tests for Update Last Seen API...');

  // Start test server on random available port
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    // Connect with retry for cloud compute wake-up
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await prisma.$connect();
        break;
      } catch (e) {
        if (attempt === 4) throw e;
        console.log(`[Phase 7 Test] Database wake-up in progress, retrying (${attempt}/4)...`);
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    console.log('[Phase 7 Test] Preparing test users in PostgreSQL...');

    // 1. Ensure test users exist
    const alice = await userRepository.upsert({
      name: 'Alice Phase7',
      email: 'alice.phase7@test.com',
    });

    const bob = await userRepository.upsert({
      name: 'Bob Phase7',
      email: 'bob.phase7@test.com',
    });

    const charlie = await userRepository.upsert({
      name: 'Charlie Phase7',
      email: 'charlie.phase7@test.com',
    });

    console.log(
      `[Phase 7 Test] Users ready: Alice (${alice.id}), Bob (${bob.id}), Charlie (${charlie.id})`
    );

    // 2. Clean up any previous chat between Alice and Bob
    const existingChat = await chatRepository.findExistingOneToOneChat(alice.id, bob.id);
    if (existingChat) {
      await messageRepository.clearChatMessages(existingChat.id);
      await chatRepository.deleteChat(existingChat.id);
    }

    // 3. Create fresh chat between Alice and Bob
    const { chat } = await chatRepository.createOneToOneChat(alice.id, bob.id);
    const chatId = chat.id;
    console.log(`[Phase 7 Test] Fresh test chat created: ${chatId}`);

    // 4. Alice sends a message to live Firestore
    const aliceMessage = await messageRepository.createMessage({
      chatId,
      senderId: alice.id,
      text: 'Hey Bob, this is the message to mark as last seen!',
    });
    const messageId = aliceMessage.id;
    console.log(`[Phase 7 Test] Alice message created in Firestore: ${messageId}`);

    // TEST 1: Update last seen for Bob with valid messageId -> 200 OK
    const res1 = await request(
      server,
      `/chat/${chatId}/lastseen`,
      'POST',
      {
        userId: bob.id,
        messageId: messageId,
      }
    );

    if (
      res1.status !== 200 ||
      res1.data?.data?.chatId !== chatId ||
      res1.data?.data?.userId !== bob.id ||
      res1.data?.data?.lastSeenMessageId !== messageId ||
      !res1.data?.data?.updatedAt
    ) {
      throw new Error(`Test 1 Failed: Expected 200 OK with last seen details, got ${res1.status}: ${JSON.stringify(res1.data)}`);
    }
    console.log(`✔ Test 1: Bob updated last seen message (Status: 200, LastSeenId: ${res1.data.data.lastSeenMessageId})`);

    // TEST 2: Update last seen with an invalid/fake messageId -> 404 Not Found
    const res2 = await request(
      server,
      `/chat/${chatId}/lastseen`,
      'POST',
      {
        userId: bob.id,
        messageId: 'fake-non-existent-message-id',
      }
    );

    if (res2.status !== 404) {
      throw new Error(`Test 2 Failed: Expected 404 Not Found for invalid messageId, got ${res2.status}: ${JSON.stringify(res2.data)}`);
    }
    console.log('✔ Test 2: Invalid messageId rejected with 404 Not Found');

    // TEST 3: Non-member Charlie attempts to update last seen -> 403 Forbidden
    const res3 = await request(
      server,
      `/chat/${chatId}/lastseen`,
      'POST',
      {
        userId: charlie.id,
        messageId: messageId,
      }
    );

    if (res3.status !== 403) {
      throw new Error(`Test 3 Failed: Expected 403 Forbidden for non-member Charlie, got ${res3.status}: ${JSON.stringify(res3.data)}`);
    }
    console.log('✔ Test 3: Non-member Charlie rejected with 403 Forbidden');

    // TEST 4: Malformed chatId (invalid UUID) -> 400 Bad Request
    const res4 = await request(
      server,
      '/chat/invalid-chat-id-format/lastseen',
      'POST',
      {
        userId: bob.id,
        messageId: messageId,
      }
    );

    if (res4.status !== 400) {
      throw new Error(`Test 4 Failed: Expected 400 Bad Request for malformed chatId, got ${res4.status}: ${JSON.stringify(res4.data)}`);
    }
    console.log('✔ Test 4: Malformed chatId rejected with 400 Bad Request');

    // TEST 5: Missing messageId in body -> 400 Bad Request
    const res5 = await request(
      server,
      `/chat/${chatId}/lastseen`,
      'POST',
      {
        userId: bob.id,
      }
    );

    if (res5.status !== 400) {
      throw new Error(`Test 5 Failed: Expected 400 Bad Request for missing messageId, got ${res5.status}: ${JSON.stringify(res5.data)}`);
    }
    console.log('✔ Test 5: Missing messageId rejected with 400 Bad Request');

    // TEST 6: Verify Firestore document persistence via lastSeenRepository.getLastSeen
    const persisted = await lastSeenRepository.getLastSeen(chatId, bob.id);
    if (!persisted || persisted.lastSeenMessageId !== messageId) {
      throw new Error(`Test 6 Failed: Firestore document not persisted correctly: ${JSON.stringify(persisted)}`);
    }
    console.log(`✔ Test 6: Firestore document persistence verified directly (MessageId: ${persisted.lastSeenMessageId})`);

    console.log('\n[Phase 7 Test] All 6 test cases passed successfully! 🎉');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhase7Tests().catch((err) => {
  console.error('\n❌ [Phase 7 Test] Error:', err.message);
  process.exit(1);
});
