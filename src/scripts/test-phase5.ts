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

async function runPhase5Tests(): Promise<void> {
  console.log('[Phase 5 Test] Starting integration tests for Send and Get Messages API...');

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
        console.log(`[Phase 5 Test] Database wake-up in progress, retrying (${attempt}/4)...`);
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    console.log('[Phase 5 Test] Preparing test users in PostgreSQL...');

    // 1. Ensure test users exist
    const alice = await userRepository.upsert({
      name: 'Alice Phase5',
      email: 'alice.phase5@test.com',
    });

    const bob = await userRepository.upsert({
      name: 'Bob Phase5',
      email: 'bob.phase5@test.com',
    });

    const charlie = await userRepository.upsert({
      name: 'Charlie Phase5',
      email: 'charlie.phase5@test.com',
    });

    console.log(
      `[Phase 5 Test] Users ready: Alice (${alice.id}), Bob (${bob.id}), Charlie (${charlie.id})`
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
    console.log(`[Phase 5 Test] Fresh test chat created: ${chatId}`);

    // TEST 0: Empty message list handling on newly created chat
    const res0 = await request(server, `/chat/${chatId}/messages`, 'GET');
    if (
      res0.status !== 200 ||
      !Array.isArray(res0.data?.data?.messages) ||
      res0.data.data.messages.length !== 0 ||
      res0.data.data.count !== 0
    ) {
      throw new Error(
        `Test 0 Failed: Expected 200 OK with empty messages array and count 0, got ${res0.status}: ${JSON.stringify(
          res0.data
        )}`
      );
    }
    console.log('✔ Test 0: Empty message list handled gracefully (Status: 200, count: 0, messages: [])');

    // TEST 1: Send message from Alice (Member)
    const res1 = await request(
      server,
      `/chat/${chatId}/message/send`,
      'POST',
      {
        senderId: alice.id,
        text: 'Hello Bob! This is message 1 from Alice.',
      }
    );

    if (res1.status !== 201 || !res1.data?.data?.id || res1.data.data.senderId !== alice.id) {
      throw new Error(`Test 1 Failed: Expected 201 Created with message data, got ${res1.status}: ${JSON.stringify(res1.data)}`);
    }
    const message1Id = res1.data.data.id;
    console.log(`✔ Test 1: Message 1 sent by Alice (Status: 201, MessageId: ${message1Id})`);

    // TEST 2: Send message from Bob (Member)
    const res2 = await request(
      server,
      `/chat/${chatId}/message/send`,
      'POST',
      {
        senderId: bob.id,
        text: 'Hey Alice! This is message 2 from Bob.',
      }
    );

    if (res2.status !== 201 || !res2.data?.data?.id || res2.data.data.senderId !== bob.id) {
      throw new Error(`Test 2 Failed: Expected 201 Created with message data, got ${res2.status}: ${JSON.stringify(res2.data)}`);
    }
    const message2Id = res2.data.data.id;
    console.log(`✔ Test 2: Message 2 sent by Bob (Status: 201, MessageId: ${message2Id})`);

    // TEST 3: Send message from Charlie (Non-member -> Forbidden)
    const res3 = await request(
      server,
      `/chat/${chatId}/message/send`,
      'POST',
      {
        senderId: charlie.id,
        text: 'Sneaking into this chat!',
      }
    );

    if (res3.status !== 403) {
      throw new Error(`Test 3 Failed: Expected 403 Forbidden for non-member, got ${res3.status}: ${JSON.stringify(res3.data)}`);
    }
    console.log('✔ Test 3: Unauthorized sender (Charlie) rejected with 403 Forbidden');

    // TEST 4a: Send empty text message -> Bad Request
    const res4a = await request(
      server,
      `/chat/${chatId}/message/send`,
      'POST',
      {
        senderId: alice.id,
        text: '   ',
      }
    );

    if (res4a.status !== 400) {
      throw new Error(`Test 4a Failed: Expected 400 Bad Request for empty text, got ${res4a.status}: ${JSON.stringify(res4a.data)}`);
    }
    console.log('✔ Test 4a: Empty text message rejected with 400 Bad Request');

    // TEST 4b: Send message with missing senderId -> Bad Request
    const res4b = await request(
      server,
      `/chat/${chatId}/message/send`,
      'POST',
      {
        text: 'Valid message without sender',
      }
    );
    if (res4b.status !== 400) {
      throw new Error(`Test 4b Failed: Expected 400 Bad Request for missing senderId, got ${res4b.status}`);
    }
    console.log('✔ Test 4b: Missing senderId rejected with 400 Bad Request');

    // TEST 4c: Send message exceeding 5000 chars -> Bad Request
    const res4c = await request(
      server,
      `/chat/${chatId}/message/send`,
      'POST',
      {
        senderId: alice.id,
        text: 'a'.repeat(5001),
      }
    );
    if (res4c.status !== 400) {
      throw new Error(`Test 4c Failed: Expected 400 Bad Request for >5000 char message, got ${res4c.status}`);
    }
    console.log('✔ Test 4c: Oversized message text (>5000 chars) rejected with 400 Bad Request');

    // TEST 5: Get messages for chat with limit=10 -> Chronological order
    const res5 = await request(server, `/chat/${chatId}/messages?limit=10`, 'GET');

    if (res5.status !== 200 || !Array.isArray(res5.data?.data?.messages)) {
      throw new Error(`Test 5 Failed: Expected 200 OK with messages array, got ${res5.status}: ${JSON.stringify(res5.data)}`);
    }

    const messages = res5.data.data.messages;
    if (messages.length < 2) {
      throw new Error(`Test 5 Failed: Expected at least 2 messages, got ${messages.length}`);
    }

    // Verify chronological order: oldest (Alice) first, newest (Bob) second
    const aliceMsgIndex = messages.findIndex((m: any) => m.id === message1Id);
    const bobMsgIndex = messages.findIndex((m: any) => m.id === message2Id);

    if (aliceMsgIndex === -1 || bobMsgIndex === -1 || aliceMsgIndex > bobMsgIndex) {
      throw new Error(
        `Test 5 Failed: Messages not in chronological order. Alice index: ${aliceMsgIndex}, Bob index: ${bobMsgIndex}`
      );
    }
    console.log(`✔ Test 5: Retrieved ${messages.length} messages in chronological order (Alice first, then Bob)`);

    // TEST 6: Pagination limit check
    const res6 = await request(server, `/chat/${chatId}/messages?limit=1`, 'GET');
    if (res6.status !== 200 || res6.data?.data?.messages?.length !== 1 || !res6.data.data.hasMore) {
      throw new Error(`Test 6 Failed: Expected limit=1 with hasMore: true, got ${JSON.stringify(res6.data)}`);
    }
    console.log('✔ Test 6: Pagination limit=1 verified with hasMore: true');

    // TEST 7a: Invalid chatId format on GET /chat/:chatId/messages
    const res7a = await request(server, '/chat/invalid-uuid-format/messages', 'GET');
    if (res7a.status !== 400) {
      throw new Error(`Test 7a Failed: Expected 400 Bad Request for invalid UUID format, got ${res7a.status}`);
    }
    console.log('✔ Test 7a: Invalid UUID on GET messages rejected with 400 Bad Request');

    // TEST 7b: Invalid chatId format on POST /chat/:chatId/message/send
    const res7b = await request(
      server,
      '/chat/invalid-uuid-format/message/send',
      'POST',
      {
        senderId: alice.id,
        text: 'Test message',
      }
    );
    if (res7b.status !== 400) {
      throw new Error(`Test 7b Failed: Expected 400 Bad Request on invalid UUID send, got ${res7b.status}`);
    }
    console.log('✔ Test 7b: Invalid UUID on POST send rejected with 400 Bad Request');

    // TEST 8a: Non-existent chatId on POST send
    const res8a = await request(
      server,
      '/chat/a0000000-0000-0000-0000-000000000000/message/send',
      'POST',
      {
        senderId: alice.id,
        text: 'Testing non-existent chat',
      }
    );
    if (res8a.status !== 404) {
      throw new Error(`Test 8a Failed: Expected 404 Not Found for non-existent chat on send, got ${res8a.status}`);
    }
    console.log('✔ Test 8a: Non-existent chat on send rejected with 404 Not Found');

    // TEST 8b: Non-existent chatId on GET messages
    const res8b = await request(
      server,
      '/chat/a0000000-0000-0000-0000-000000000000/messages',
      'GET'
    );
    if (res8b.status !== 404) {
      throw new Error(`Test 8b Failed: Expected 404 Not Found for non-existent chat on get, got ${res8b.status}`);
    }
    console.log('✔ Test 8b: Non-existent chat on get rejected with 404 Not Found');

    // TEST 9: Non-member reading messages via userId query parameter
    const res9 = await request(server, `/chat/${chatId}/messages?userId=${charlie.id}`, 'GET');
    if (res9.status !== 403) {
      throw new Error(`Test 9 Failed: Expected 403 Forbidden when Charlie attempts to read chat, got ${res9.status}`);
    }
    console.log('✔ Test 9: Non-member access rejected with 403 Forbidden');

    console.log('\n[Phase 5 Test] All 14 test cases passed successfully! 🎉');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhase5Tests().catch((err) => {
  console.error('\n❌ [Phase 5 Test] Error:', err.message);
  process.exit(1);
});
