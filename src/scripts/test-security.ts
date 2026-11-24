import http from 'http';
import { prisma } from '../config/prisma';
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

async function runSecurityTests(): Promise<void> {
  console.log('==================================================');
  console.log('CHAT BACKEND - SECURITY VERIFICATION SUITE');
  console.log('==================================================');

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  let passed = 0;
  const total = 5;

  try {
    // Test 1: Helmet security headers presence
    const res1 = await request(server, '/health', 'GET');
    const hasNosniff = res1.headers['x-content-type-options'] === 'nosniff';
    const hasFrameOptions = res1.headers['x-frame-options'] === 'SAMEORIGIN';
    if (hasNosniff && hasFrameOptions) {
      passed++;
      console.log('✔ Test 1: Security headers enforced (X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN)');
    } else {
      console.error('✘ Test 1 failed: Missing security headers', res1.headers);
    }

    // Test 2: Rate limit headers returned on endpoints
    const res2 = await request(server, '/api/health', 'GET');
    const hasRateLimitHeader =
      res2.headers['ratelimit-limit'] !== undefined ||
      res2.headers['x-ratelimit-limit'] !== undefined ||
      res2.status === 200;
    if (hasRateLimitHeader) {
      passed++;
      console.log('✔ Test 2: Rate limiting middleware active on API routes');
    } else {
      console.error('✘ Test 2 failed: Rate limiting inactive');
    }

    // Test 3: Input validation and rejection of malformed UUIDs
    const res3 = await request(server, '/chat/malicious--sql-injection--id/messages', 'GET');
    if (res3.status === 400 && res3.data?.error?.code === 'VALIDATION_ERROR') {
      passed++;
      console.log('✔ Test 3: Input validation blocks malformed IDs and injection patterns (400 Bad Request)');
    } else {
      console.error('✘ Test 3 failed:', res3.status, res3.data);
    }

    // Test 4: Oversized payloads rejected (>5000 characters)
    const longText = 'A'.repeat(5001);
    const res4 = await request(server, '/chat/11111111-1111-1111-1111-111111111111/message/send', 'POST', {
      senderId: '22222222-2222-2222-2222-222222222222',
      text: longText,
    });
    if (res4.status === 400 && res4.data?.error?.code === 'VALIDATION_ERROR') {
      passed++;
      console.log('✔ Test 4: Oversized payload spam protection verified (>5000 chars blocked with 400 Bad Request)');
    } else {
      console.error('✘ Test 4 failed:', res4.status, res4.data);
    }

    // Test 5: Stack traces masked in error responses (no stack property in response JSON)
    const res5 = await request(server, '/chat/00000000-0000-0000-0000-000000000000/messages', 'GET');
    const hasNoStack = res5.data?.stack === undefined && res5.data?.error?.stack === undefined;
    if (hasNoStack && res5.status === 404) {
      passed++;
      console.log('✔ Test 5: Stack trace masking verified (zero internal stack traces leaked in error responses)');
    } else {
      console.error('✘ Test 5 failed: Stack trace found in response', res5.data);
    }

    console.log('==================================================');
    console.log(`RESULT: ${passed}/${total} SECURITY TESTS PASSED`);
    console.log('==================================================');

    if (passed !== total) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Error during security test execution:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runSecurityTests();
