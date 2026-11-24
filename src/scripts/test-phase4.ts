import { prisma } from '../config/prisma';
import { userRepository } from '../repositories/user.repository';
import { chatRepository } from '../repositories/chat.repository';
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

async function runPhase4Tests(): Promise<void> {
  console.log('[Phase 4 Test] Starting integration tests for POST /chat/create...');

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
        console.log(`[Phase 4 Test] Database wake-up in progress, retrying (${attempt}/4)...`);
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    // Setup: Ensure 2 test users exist in PostgreSQL via UserRepository
    console.log('[Phase 4 Test] Preparing test users in PostgreSQL...');
      const userAlice = await userRepository.upsert({
        name: 'Alice Test',
        email: 'alice.phase4@test.com',
      });

        const userBob = await userRepository.upsert({
          name: 'Bob Test',
          email: 'bob.phase4@test.com',
        });

        console.log(`[Phase 4 Test] Users ready: Alice (${userAlice.id}), Bob (${userBob.id})`);

        // Clean up any existing chats between Alice and Bob from previous test runs
        const existingChat = await chatRepository.findExistingOneToOneChat(userAlice.id, userBob.id);
        if(existingChat) {
          await chatRepository.deleteChat(existingChat.id);
        }

    // Test 1: Call /chat/create with Alice and Bob -> Expect 201 Created and isExisting: false
    const res1 = await request(server, '/chat/create', 'POST', {
          userAId: userAlice.id,
          userBId: userBob.id,
        });
        if(res1.status !== 201 || !res1.data.data?.chatId || res1.data.data?.isExisting !== false) {
      throw new Error(
        `Test 1 Failed: Expected status 201 with isExisting=false, got ${res1.status}: ${JSON.stringify(res1.data)}`
      );
    }
    const createdChatId = res1.data.data.chatId;
    console.log(`✔ Test 1: New chat created between Alice & Bob (Status: 201, ChatId: ${createdChatId})`);

    // Test 2: Call /chat/create with Alice and Bob again -> Expect 200 OK, same chatId, isExisting: true
    const res2 = await request(server, '/chat/create', 'POST', {
      userAId: userAlice.id,
      userBId: userBob.id,
    });
    if (res2.status !== 200 || res2.data.data?.chatId !== createdChatId || res2.data.data?.isExisting !== true) {
      throw new Error(
        `Test 2 Failed: Expected status 200 with same chatId and isExisting=true, got ${res2.status}: ${JSON.stringify(res2.data)}`
      );
    }
    console.log(`✔ Test 2: Idempotent duplicate check with same order (Status: 200, ChatId: ${res2.data.data.chatId}, isExisting: true)`);

    // Test 3: Call /chat/create with Bob and Alice (reversed IDs) -> Expect 200 OK, same chatId
    const res3 = await request(server, '/chat/create', 'POST', {
      userAId: userBob.id,
      userBId: userAlice.id,
    });
    if (res3.status !== 200 || res3.data.data?.chatId !== createdChatId || res3.data.data?.isExisting !== true) {
      throw new Error(
        `Test 3 Failed: Expected status 200 with same chatId for reversed order, got ${res3.status}: ${JSON.stringify(res3.data)}`
      );
    }
    console.log(`✔ Test 3: Idempotent duplicate check with reversed order (Status: 200, ChatId: ${res3.data.data.chatId}, isExisting: true)`);

    // Test 4: Call with identical user IDs (userAId === userBId) -> Expect 400 Bad Request
    const res4 = await request(server, '/chat/create', 'POST', {
      userAId: userAlice.id,
      userBId: userAlice.id,
    });
    if (res4.status !== 400) {
      throw new Error(`Test 4 Failed: Expected status 400 for identical users, got ${res4.status}: ${JSON.stringify(res4.data)}`);
    }
    console.log(`✔ Test 4: Same user ID rejected with 400 Bad Request`);

    // Test 5: Call with non-existent user ID -> Expect 404 Not Found
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res5 = await request(server, '/chat/create', 'POST', {
      userAId: userAlice.id,
      userBId: fakeId,
    });
    if (res5.status !== 404) {
      throw new Error(`Test 5 Failed: Expected status 404 for non-existent user, got ${res5.status}: ${JSON.stringify(res5.data)}`);
    }
    console.log(`✔ Test 5: Non-existent user rejected with 404 Not Found`);

    console.log('\n[Phase 4 Test] All 5 tests passed successfully! 🎉');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ [Phase 4 Test] Test suite failed:', err);
    server.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

void runPhase4Tests();
