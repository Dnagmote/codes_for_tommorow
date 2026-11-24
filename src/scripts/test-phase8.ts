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

async function runPhase8Tests(): Promise<void> {
  console.log('[Phase 8 Test] Starting integration tests for Get User Chats API...');

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
        console.log(`[Phase 8 Test] Database wake-up in progress, retrying (${attempt}/4)...`);
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    console.log('[Phase 8 Test] Preparing test users in PostgreSQL...');

    // 1. Ensure test users exist
    const alice = await userRepository.upsert({
      name: 'Alice Phase8',
      email: 'alice.phase8@test.com',
    });

    const bob = await userRepository.upsert({
      name: 'Bob Phase8',
      email: 'bob.phase8@test.com',
    });

    const charlie = await userRepository.upsert({
      name: 'Charlie Phase8',
      email: 'charlie.phase8@test.com',
    });

    const dave = await userRepository.upsert({
      name: 'Dave Phase8',
      email: 'dave.phase8@test.com',
    });

    console.log(
      `[Phase 8 Test] Users ready: Alice (${alice.id}), Bob (${bob.id}), Charlie (${charlie.id}), Dave (${dave.id})`
    );

    // 2. Clean up any previous chat between Alice and Bob
    const existingChatAB = await chatRepository.findExistingOneToOneChat(alice.id, bob.id);
    if (existingChatAB) {
      await messageRepository.clearChatMessages(existingChatAB.id);
      await chatRepository.deleteChat(existingChatAB.id);
    }

    // Clean up any previous chat for Charlie (to ensure zero chats)
    const existingChatCD = await chatRepository.findExistingOneToOneChat(charlie.id, dave.id);
    if (existingChatCD) {
      await messageRepository.clearChatMessages(existingChatCD.id);
      await chatRepository.deleteChat(existingChatCD.id);
    }

    // Clean up any previous chat between Alice and Dave
    const existingChatAD = await chatRepository.findExistingOneToOneChat(alice.id, dave.id);
    if (existingChatAD) {
      await messageRepository.clearChatMessages(existingChatAD.id);
      await chatRepository.deleteChat(existingChatAD.id);
    }

    // 3. Create Chat 1 between Alice and Bob
    const { chat: chatAB } = await chatRepository.createOneToOneChat(alice.id, bob.id);
    const chatIdAB = chatAB.id;
    console.log(`[Phase 8 Test] Chat 1 created between Alice & Bob: ${chatIdAB}`);

    // Alice sends a message in Chat 1
    const aliceMessage = await messageRepository.createMessage({
      chatId: chatIdAB,
      senderId: alice.id,
      text: 'First message from Alice to Bob in Phase 8',
    });

    // Bob sends a message in Chat 1 (making this the latest message)
    const bobMessage = await messageRepository.createMessage({
      chatId: chatIdAB,
      senderId: bob.id,
      text: 'Latest message from Bob to Alice in Phase 8',
    });
    console.log(`[Phase 8 Test] Messages created in Firestore. Latest message ID: ${bobMessage.id}`);

    // Bob marks Alice's message as last seen
    await lastSeenRepository.updateLastSeen(chatIdAB, bob.id, aliceMessage.id);
    console.log(`[Phase 8 Test] Bob updated last seen message pointer in Firestore`);

    // 4. Create Chat 2 between Alice and Dave with NO messages (to test zero messages handling)
    const { chat: chatAD } = await chatRepository.createOneToOneChat(alice.id, dave.id);
    console.log(`[Phase 8 Test] Chat 2 created between Alice & Dave (zero messages): ${chatAD.id}`);

    // TEST 1: Fetch chats for Alice -> Expect 200 OK with both chats
    const res1 = await request(server, `/user/${alice.id}/chats`, 'GET');

    if (res1.status !== 200 || !Array.isArray(res1.data?.data)) {
      throw new Error(`Test 1 Failed: Expected 200 OK with chats array, got ${res1.status}: ${JSON.stringify(res1.data)}`);
    }

    const aliceChats = res1.data.data;
    if (aliceChats.length < 2) {
      throw new Error(`Test 1 Failed: Expected at least 2 chats for Alice, got ${aliceChats.length}`);
    }

    const chat1Data = aliceChats.find((c: any) => c.chatId === chatIdAB);
    if (!chat1Data || !chat1Data.lastMessage || chat1Data.lastMessage.id !== bobMessage.id) {
      throw new Error(`Test 1 Failed: Chat 1 latest message not populated correctly: ${JSON.stringify(chat1Data)}`);
    }
    console.log(`✔ Test 1: Alice's chats retrieved (Status: 200, 2 chats found, latest message verified: "${chat1Data.lastMessage.text}")`);

    // TEST 2: Fetch chats for Bob -> Expect 200 OK, lastSeen populated
    const res2 = await request(server, `/user/${bob.id}/chats`, 'GET');

    if (res2.status !== 200 || !Array.isArray(res2.data?.data)) {
      throw new Error(`Test 2 Failed: Expected 200 OK with chats array for Bob, got ${res2.status}`);
    }

    const bobChat = res2.data.data.find((c: any) => c.chatId === chatIdAB);
    if (!bobChat || !bobChat.lastSeen || bobChat.lastSeen.messageId !== aliceMessage.id) {
      throw new Error(`Test 2 Failed: Bob's lastSeen pointer not populated correctly: ${JSON.stringify(bobChat)}`);
    }
    console.log(`✔ Test 2: Bob's chats retrieved (Status: 200, lastSeen pointer verified: ${bobChat.lastSeen.messageId})`);

    // TEST 3: Fetch chats for Charlie (user with zero chats) -> Expect 200 OK with empty array []
    const res3 = await request(server, `/user/${charlie.id}/chats`, 'GET');

    if (res3.status !== 200 || !Array.isArray(res3.data?.data) || res3.data.data.length !== 0) {
      throw new Error(`Test 3 Failed: Expected 200 OK with empty array for Charlie, got ${res3.status}: ${JSON.stringify(res3.data)}`);
    }
    console.log('✔ Test 3: Charlie (zero chats) returned empty array [] with 200 OK');

    // TEST 4: Fetch chats for non-existent userId -> Expect 404 Not Found
    const res4 = await request(server, '/user/a0000000-0000-0000-0000-000000000000/chats', 'GET');

    if (res4.status !== 404) {
      throw new Error(`Test 4 Failed: Expected 404 Not Found for non-existent user, got ${res4.status}: ${JSON.stringify(res4.data)}`);
    }
    console.log('✔ Test 4: Non-existent user rejected with 404 Not Found');

    // TEST 5: Verify chat with no messages returns lastMessage: null and lastSeen: null
    const res5 = await request(server, `/user/${dave.id}/chats`, 'GET');
    if (res5.status !== 200 || !Array.isArray(res5.data?.data)) {
      throw new Error(`Test 5 Failed: Expected 200 OK for Dave's chats, got ${res5.status}`);
    }
    const daveChat = res5.data.data.find((c: any) => c.chatId === chatAD.id);
    if (!daveChat || daveChat.lastMessage !== null || daveChat.lastSeen !== null) {
      throw new Error(`Test 5 Failed: Expected lastMessage: null and lastSeen: null for empty chat, got: ${JSON.stringify(daveChat)}`);
    }
    console.log('✔ Test 5: Chat without messages handled gracefully with lastMessage: null and lastSeen: null');

    console.log('\n[Phase 8 Test] All 5 test cases passed successfully! 🎉');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhase8Tests().catch((err) => {
  console.error('\n❌ [Phase 8 Test] Error:', err.message);
  process.exit(1);
});
