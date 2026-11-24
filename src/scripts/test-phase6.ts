import { prisma } from '../config/prisma';
import { userRepository } from '../repositories/user.repository';
import { chatRepository } from '../repositories/chat.repository';
import { messageRepository } from '../repositories/message.repository';
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

async function runPhase6Tests(): Promise<void> {
  console.log('[Phase 6 Test] Starting integration tests for Read Receipts API...');

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
        console.log(`[Phase 6 Test] Database wake-up in progress, retrying (${attempt}/4)...`);
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    console.log('[Phase 6 Test] Preparing test users in PostgreSQL...');

    // 1. Ensure test users exist
    const alice = await userRepository.upsert({
      name: 'Alice Phase6',
      email: 'alice.phase6@test.com',
    });

    const bob = await userRepository.upsert({
      name: 'Bob Phase6',
      email: 'bob.phase6@test.com',
    });

    const charlie = await userRepository.upsert({
      name: 'Charlie Phase6',
      email: 'charlie.phase6@test.com',
    });

    console.log(
      `[Phase 6 Test] Users ready: Alice (${alice.id}), Bob (${bob.id}), Charlie (${charlie.id})`
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
    console.log(`[Phase 6 Test] Fresh test chat created: ${chatId}`);

    // 4. Alice sends a message to live Firestore
    const aliceMessage = await messageRepository.createMessage({
      chatId,
      senderId: alice.id,
      text: 'Hey Bob, please read this important message!',
    });
    const messageId = aliceMessage.id;
    console.log(`[Phase 6 Test] Alice message created in Firestore: ${messageId}`);

    // TEST 1: Bob marks Alice's message as read -> 200 OK
    const res1 = await request(
      server,
      `/chat/${chatId}/message/${messageId}/read`,
      'POST',
      { userId: bob.id }
    );

    if (
      res1.status !== 200 ||
      res1.data?.data?.chatId !== chatId ||
      res1.data?.data?.messageId !== messageId ||
      res1.data?.data?.userId !== bob.id ||
      !res1.data?.data?.readAt
    ) {
      throw new Error(`Test 1 Failed: Expected 200 OK with receipt details, got ${res1.status}: ${JSON.stringify(res1.data)}`);
    }
    console.log(`✔ Test 1: Bob marked Alice's message as read (Status: 200, Timestamp: ${res1.data.data.readAt})`);

    // TEST 2: Repeat Bob marking Alice's message as read -> 200 OK (Idempotency)
    const res2 = await request(
      server,
      `/chat/${chatId}/message/${messageId}/read`,
      'POST',
      { userId: bob.id }
    );

    if (res2.status !== 200 || res2.data?.data?.userId !== bob.id) {
      throw new Error(`Test 2 Failed: Idempotent repeat read receipt failed with status ${res2.status}: ${JSON.stringify(res2.data)}`);
    }
    console.log('✔ Test 2: Idempotent repeat read receipt succeeded (Status: 200)');

    // TEST 3: Charlie (non-member) attempts to mark message as read -> 403 Forbidden
    const res3 = await request(
      server,
      `/chat/${chatId}/message/${messageId}/read`,
      'POST',
      { userId: charlie.id }
    );

    if (res3.status !== 403) {
      throw new Error(`Test 3 Failed: Expected 403 Forbidden for non-member Charlie, got ${res3.status}: ${JSON.stringify(res3.data)}`);
    }
    console.log('✔ Test 3: Non-member Charlie rejected with 403 Forbidden');

    // TEST 4: Marking non-existent messageId as read -> 404 Not Found
    const res4 = await request(
      server,
      `/chat/${chatId}/message/non-existent-message-id-9999/read`,
      'POST',
      { userId: bob.id }
    );

    if (res4.status !== 404) {
      throw new Error(`Test 4 Failed: Expected 404 Not Found for non-existent message, got ${res4.status}: ${JSON.stringify(res4.data)}`);
    }
    console.log('✔ Test 4: Non-existent messageId rejected with 404 Not Found');

    // TEST 5: Invalid UUID format for chatId -> 400 Bad Request
    const res5 = await request(
      server,
      `/chat/invalid-chat-uuid/message/${messageId}/read`,
      'POST',
      { userId: bob.id }
    );

    if (res5.status !== 400) {
      throw new Error(`Test 5 Failed: Expected 400 Bad Request for invalid chatId format, got ${res5.status}: ${JSON.stringify(res5.data)}`);
    }
    console.log('✔ Test 5: Invalid UUID chatId format rejected with 400 Bad Request');

    // TEST 6: Missing userId in request body -> 400 Bad Request
    const res6 = await request(
      server,
      `/chat/${chatId}/message/${messageId}/read`,
      'POST',
      {}
    );

    if (res6.status !== 400) {
      throw new Error(`Test 6 Failed: Expected 400 Bad Request for missing userId, got ${res6.status}: ${JSON.stringify(res6.data)}`);
    }
    console.log('✔ Test 6: Missing userId payload rejected with 400 Bad Request');

    console.log('\n[Phase 6 Test] All 6 test cases passed successfully! 🎉');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhase6Tests().catch((err) => {
  console.error('\n❌ [Phase 6 Test] Error:', err.message);
  process.exit(1);
});
