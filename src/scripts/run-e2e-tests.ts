import http from 'http';
import { prisma } from '../config/prisma';
import { userRepository } from '../repositories/user.repository';
import app from '../app';

interface TestResponse<T = any> {
  status: number;
  data: T;
  headers: http.IncomingHttpHeaders;
}

function request<T = any>(
  server: http.Server,
  path: string,
  method: string,
  body?: any
): Promise<TestResponse<T>> {
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
            resolve({
              status: res.statusCode || 500,
              data: parsed,
              headers: res.headers,
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              data: responseBody as any,
              headers: res.headers,
            });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runMasterE2ETestSuite(): Promise<void> {
  console.log('==================================================');
  console.log('CHAT BACKEND - MASTER END-TO-END VERIFICATION SUITE');
  console.log('==================================================');

  // Start test server on random available port
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  let passedAssertions = 0;
  const totalAssertions = 14;

  try {
    // Database connection retry for cloud DB
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await prisma.$connect();
        break;
      } catch (e) {
        if (attempt === 4) throw e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Seed clean, isolated test users with timestamps
    const ts = Date.now();
    const alice = await userRepository.upsert({
      name: 'Alice MasterE2E',
      email: `alice.e2e.${ts}@test.com`,
    });
    const bob = await userRepository.upsert({
      name: 'Bob MasterE2E',
      email: `bob.e2e.${ts}@test.com`,
    });
    const charlie = await userRepository.upsert({
      name: 'Charlie MasterE2E',
      email: `charlie.e2e.${ts}@test.com`,
    });

    let chatId = '';
    let message1Id = '';
    let message2Id = '';

    // Step 1: Health check endpoint operational
    const res1 = await request(server, '/api/health', 'GET');
    if (res1.status === 200 && res1.data?.data?.status === 'ok') {
      passedAssertions++;
      console.log('✔ [01/14] Health check endpoint operational (200 OK)');
    } else {
      console.error(`✘ [01/14] Failed: expected 200, got ${res1.status}`);
    }

    // Step 2: Create chat Alice & Bob returns 201 Created
    const res2 = await request(server, '/chat/create', 'POST', {
      userAId: alice.id,
      userBId: bob.id,
    });
    if (
      res2.status === 201 &&
      res2.data?.data?.chatId &&
      res2.data?.data?.isExisting === false
    ) {
      chatId = res2.data.data.chatId;
      passedAssertions++;
      console.log('✔ [02/14] Create chat Alice & Bob returns 201 Created');
    } else {
      console.error(`✘ [02/14] Failed: expected 201, got ${res2.status}`);
    }

    // Step 3: Duplicate chat creation returns 200 OK with identical chatId
    const res3 = await request(server, '/chat/create', 'POST', {
      userAId: bob.id,
      userBId: alice.id,
    });
    if (
      res3.status === 200 &&
      res3.data?.data?.chatId === chatId &&
      res3.data?.data?.isExisting === true
    ) {
      passedAssertions++;
      console.log(
        '✔ [03/14] Duplicate chat creation returns 200 OK with identical chatId'
      );
    } else {
      console.error(`✘ [03/14] Failed: expected 200, got ${res3.status}`);
    }

    // Step 4: Alice sends Message 1 successfully (201 Created)
    const res4 = await request(
      server,
      `/chat/${chatId}/message/send`,
      'POST',
      {
        senderId: alice.id,
        text: 'Hello Bob! This is Message 1 from Alice.',
      }
    );
    const m1Id = res4.data?.data?.id || res4.data?.data?.messageId;
    if (res4.status === 201 && m1Id) {
      message1Id = m1Id;
      passedAssertions++;
      console.log('✔ [04/14] Alice sends Message 1 successfully (201 Created)');
    } else {
      console.error(`✘ [04/14] Failed: expected 201, got ${res4.status}`);
    }

    // Small delay for Firestore timestamp ordering
    await new Promise((r) => setTimeout(r, 100));

    // Step 5: Bob sends Message 2 successfully (201 Created)
    const res5 = await request(
      server,
      `/chat/${chatId}/message/send`,
      'POST',
      {
        senderId: bob.id,
        text: 'Hi Alice! Message 1 received. Here is Message 2 from Bob.',
      }
    );
    const m2Id = res5.data?.data?.id || res5.data?.data?.messageId;
    if (res5.status === 201 && m2Id) {
      message2Id = m2Id;
      passedAssertions++;
      console.log('✔ [05/14] Bob sends Message 2 successfully (201 Created)');
    } else {
      console.error(`✘ [05/14] Failed: expected 201, got ${res5.status}`);
    }

    // Step 6: Unauthorized message by Charlie rejected (403 Forbidden)
    const res6 = await request(
      server,
      `/chat/${chatId}/message/send`,
      'POST',
      {
        senderId: charlie.id,
        text: 'Charlie trying to intrude in Alice and Bob chat.',
      }
    );
    if (res6.status === 403) {
      passedAssertions++;
      console.log(
        '✔ [06/14] Unauthorized message by Charlie rejected (403 Forbidden)'
      );
    } else {
      console.error(`✘ [06/14] Failed: expected 403, got ${res6.status}`);
    }

    // Step 7: Get messages returns 2 messages in chronological order (200 OK)
    const res7 = await request(
      server,
      `/chat/${chatId}/messages?limit=10&userId=${alice.id}`,
      'GET'
    );
    const messages = res7.data?.data?.messages;
    if (
      res7.status === 200 &&
      Array.isArray(messages) &&
      messages.length === 2 &&
      (messages[0].id === message1Id || messages[0].messageId === message1Id) &&
      (messages[1].id === message2Id || messages[1].messageId === message2Id)
    ) {
      passedAssertions++;
      console.log(
        '✔ [07/14] Get messages returns 2 messages in chronological order (200 OK)'
      );
    } else {
      console.error(
        `✘ [07/14] Failed: expected 2 messages in order, got status ${res7.status}`
      );
    }

    // Step 8: Bob marks Message 1 as read (200 OK)
    const res8 = await request(
      server,
      `/chat/${chatId}/message/${message1Id}/read`,
      'POST',
      { userId: bob.id }
    );
    if (
      res8.status === 200 &&
      (res8.data?.data?.messageId === message1Id || res8.data?.data?.id === message1Id) &&
      res8.data?.data?.userId === bob.id
    ) {
      passedAssertions++;
      console.log('✔ [08/14] Bob marks Message 1 as read (200 OK)');
    } else {
      console.error(`✘ [08/14] Failed: expected 200, got ${res8.status}`);
    }

    // Step 9: Repeated read receipt is idempotent (200 OK)
    const res9 = await request(
      server,
      `/chat/${chatId}/message/${message1Id}/read`,
      'POST',
      { userId: bob.id }
    );
    if (
      res9.status === 200 &&
      (res9.data?.data?.messageId === message1Id || res9.data?.data?.id === message1Id)
    ) {
      passedAssertions++;
      console.log('✔ [09/14] Repeated read receipt is idempotent (200 OK)');
    } else {
      console.error(`✘ [09/14] Failed: expected 200, got ${res9.status}`);
    }

    // Step 10: Bob updates last seen to Message 2 (200 OK)
    const res10 = await request(
      server,
      `/chat/${chatId}/lastseen`,
      'POST',
      {
        userId: bob.id,
        messageId: message2Id,
      }
    );
    if (
      res10.status === 200 &&
      (res10.data?.data?.lastSeenMessageId === message2Id || res10.data?.data?.messageId === message2Id) &&
      res10.data?.data?.userId === bob.id
    ) {
      passedAssertions++;
      console.log('✔ [10/14] Bob updates last seen to Message 2 (200 OK)');
    } else {
      console.error(`✘ [10/14] Failed: expected 200, got ${res10.status}`);
    }

    // Step 11: Last seen with fake messageId rejected (404 Not Found)
    const res11 = await request(
      server,
      `/chat/${chatId}/lastseen`,
      'POST',
      {
        userId: bob.id,
        messageId: 'non-existent-fake-msg-id-99999',
      }
    );
    if (res11.status === 404) {
      passedAssertions++;
      console.log(
        '✔ [11/14] Last seen with fake messageId rejected (404 Not Found)'
      );
    } else {
      console.error(`✘ [11/14] Failed: expected 404, got ${res11.status}`);
    }

    // Step 12: List chats for Alice shows chat with Bob and latest message (200 OK)
    const res12 = await request(server, `/user/${alice.id}/chats`, 'GET');
    const aliceChats = res12.data?.data;
    const firstChat = Array.isArray(aliceChats) ? aliceChats[0] : null;
    if (
      res12.status === 200 &&
      Array.isArray(aliceChats) &&
      aliceChats.length === 1 &&
      firstChat?.chatId === chatId &&
      (firstChat?.lastMessage?.messageId === message2Id || firstChat?.lastMessage?.id === message2Id)
    ) {
      passedAssertions++;
      console.log(
        '✔ [12/14] List chats for Alice shows chat with Bob and latest message (200 OK)'
      );
    } else {
      console.error(
        `✘ [12/14] Failed: expected 200 with chat preview, got ${res12.status}`
      );
    }

    // Step 13: List chats for zero-chat user returns empty array (200 OK)
    const res13 = await request(server, `/user/${charlie.id}/chats`, 'GET');
    if (
      res13.status === 200 &&
      Array.isArray(res13.data?.data) &&
      res13.data.data.length === 0
    ) {
      passedAssertions++;
      console.log(
        '✔ [13/14] List chats for zero-chat user returns empty array (200 OK)'
      );
    } else {
      console.error(
        `✘ [13/14] Failed: expected 200 with empty array, got ${res13.status}`
      );
    }

    // Step 14: List chats for unknown user rejected (404 Not Found)
    const res14 = await request(
      server,
      '/user/a0000000-0000-0000-0000-000000000000/chats',
      'GET'
    );
    if (res14.status === 404) {
      passedAssertions++;
      console.log(
        '✔ [14/14] List chats for unknown user rejected (404 Not Found)'
      );
    } else {
      console.error(`✘ [14/14] Failed: expected 404, got ${res14.status}`);
    }

    console.log('==================================================');
    if (passedAssertions === totalAssertions) {
      console.log('RESULT: ALL 14 E2E TEST ASSERTIONS PASSED (100%)');
      console.log('==================================================');
    } else {
      console.error(
        `RESULT: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`
      );
      console.log('==================================================');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Fatal error during E2E test run:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runMasterE2ETestSuite();
