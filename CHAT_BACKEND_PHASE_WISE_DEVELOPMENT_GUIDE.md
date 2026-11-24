# CHAT BACKEND: PHASE-WISE DEVELOPMENT EXECUTION GUIDE
**Target Completion:** Tomorrow at 4:00 PM  
**Architecture:** Clean Modular Monolith (Express.js + TypeScript Strict Mode)  
**Database Dual-Store:** PostgreSQL with Prisma ORM (Relational Data) + Firebase Firestore via Admin SDK (Real-time Message & Read State)  

---

## Table of Contents
1. [Master Project Overview & Architectural Strategy](#master-project-overview--architectural-strategy)
2. [CLI Execution Protocol & Best Practices](#cli-execution-protocol--best-practices)
3. [Phase 1: Project Setup and Strict Architecture](#phase-1-project-setup-and-strict-architecture)
4. [Phase 2: PostgreSQL and Prisma ORM Setup](#phase-2-postgresql-and-prisma-orm-setup)
5. [Phase 3: Firebase Admin SDK & Firestore Setup](#phase-3-firebase-admin-sdk--firestore-setup)
6. [Phase 4: Create/Get Chat API (`POST /chat/create`)](#phase-4-createget-chat-api-post-chatcreate)
7. [Phase 5: Send and Get Messages API](#phase-5-send-and-get-messages-api)
8. [Phase 6: Read Receipts API (`POST /chat/:chatId/message/:messageId/read`)](#phase-6-read-receipts-api-post-chatchatidmessagemessageidread)
9. [Phase 7: Last Seen Message API (`POST /chat/:chatId/lastseen`)](#phase-7-last-seen-message-api-post-chatchatidlastseen)
10. [Phase 8: User Chats API (`GET /user/:userId/chats`)](#phase-8-user-chats-api-get-useruseridchats)
11. [Phase 9: Security, Validation, Centralized Errors & Automated E2E Testing](#phase-9-security-validation-centralized-errors--automated-e2e-testing)
12. [Phase 10: Final Documentation, Postman Collection & Submission Readiness](#phase-10-final-documentation-postman-collection--submission-readiness)
13. [Phase 11 (Optional): Group Chat Creation and Management](#phase-11-optional-group-chat-creation-and-management)
14. [Phase 12 (Optional): Message Edit and Soft Delete](#phase-12-optional-message-edit-and-soft-delete)
15. [Verification & Transition Matrix](#verification--transition-matrix)

---

## Master Project Overview & Architectural Strategy

### High-Level Architecture
This backend service implements a hybrid storage architecture designed to balance relational integrity with high-throughput real-time messaging:

1. **Relational Layer (PostgreSQL + Prisma ORM):**
   - **User Accounts:** Identity, profile information, credentials/references.
   - **Chat Metadata:** Chat rooms, chat types (`ONE_TO_ONE`, `GROUP`), creation timestamps.
   - **Chat Memberships:** Relational mapping of users to chats, roles (`MEMBER`, `ADMIN`), joined timestamps.
   - **One-to-One Chat Deduping:** Canonical sorted user pairing table (`OneToOneChatLookup`) ensuring atomic database-level enforcement of the single-chat-per-pair invariant.

2. **NoSQL Document Layer (Firebase Firestore via Firebase Admin SDK):**
   - **Messages:** Subcollection `chats/{chatId}/messages/{messageId}` storing sender, text, timestamps, and edit/delete state.
   - **Read Receipts:** Subcollection `chats/{chatId}/messages/{messageId}/reads/{userId}` and/or inline read tracking.
   - **Last Seen Tracker:** Document `chats/{chatId}/lastSeen/{userId}` tracking user activity per chat room without locking relational tables.

```
                          ┌────────────────────────┐
                          │   Express Application  │
                          │   (TypeScript Strict)  │
                          └───────────┬────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │    PostgreSQL + Prisma    │             │ Firebase Admin SDK/Store  │
   ├───────────────────────────┤             ├───────────────────────────┤
   │ - Users                   │             │ - messages collection     │
   │ - Chats (Metadata)        │             │ - read receipts           │
   │ - ChatMembers (Roles)     │             │ - lastSeen state          │
   │ - OneToOneChatLookup (UID)│             │                           │
   └───────────────────────────┘             └───────────────────────────┘
```

---

## CLI Execution Protocol & Best Practices

When executing each phase using Antigravity CLI:
1. **One Phase at a Time:** Run each phase independently. Never execute a subsequent phase until the current phase passes all compilation, linting, and automated test checks.
2. **Copy the Entire Phase Prompt:** Each phase prompt below contains the objective, required files, dependencies, exact code snippets, configuration, and verification commands.
3. **Verify the Environment:** Ensure `.env` contains valid credentials for PostgreSQL and Firebase before testing Phases 2 and 3.
4. **Automated Verification:** Every phase concludes with a deterministic test script or curl verification command.

---

## Phase 1: Project Setup and Strict Architecture

### 1. Phase Objective
Initialize a clean, production-ready Node.js + TypeScript project configured with strict TypeScript compiler options, Express.js, standardized error and response wrappers, Zod-based environment variable validation, request logging, and a health-check endpoint.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Initialize Phase 1 for the Chat Backend project in the current working directory.

Follow these strict specifications:
1. Initialize package.json and install dependencies:
   - Production: express, dotenv, zod, cors, helmet, morgan
   - Development: typescript, @types/node, @types/express, @types/cors, @types/morgan, ts-node-dev, rimraf
2. Configure tsconfig.json in strict mode:
   - Target: ES2022
   - Module: CommonJS (or NodeNext)
   - strict: true
   - noImplicitAny: true
   - strictNullChecks: true
   - noUncheckedIndexedAccess: true
   - outDir: "./dist"
   - rootDir: "./src"
3. Configure environment variable validation with Zod in src/config/env.config.ts:
   - Validate PORT (default 5000), NODE_ENV (development/production/test), DATABASE_URL (string), FIREBASE_PROJECT_ID (optional for Phase 1, required later), FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
4. Create standardized API response utilities:
   - src/utils/api-response.ts: ApiResponse.success(res, data, message, statusCode)
   - src/utils/api-error.ts: Custom ApiError extending Error with statusCode and optional details.
5. Create centralized error handling and not-found middlewares:
   - src/middlewares/error.middleware.ts: Catches ApiError, ZodError, and unexpected errors; returns uniform JSON:
     { "success": false, "error": { "code": string, "message": string, "details"?: any } }
   - src/middlewares/not-found.middleware.ts: 404 handler for unknown routes.
6. Build Express app in src/app.ts and server entry in src/server.ts:
   - Mount cors, helmet, morgan, express.json()
   - Mount health routes at /api/health and /health returning uptime, timestamp, and status: "ok"
   - Mount error handlers.
7. Add npm scripts in package.json:
   - "dev": "ts-node-dev --respawn --transpile-only src/server.ts"
   - "build": "rimraf dist && tsc"
   - "start": "node dist/server.js"
   - "lint": "tsc --noEmit"
8. Create .env.example and .env with default development settings.

Verify by running "npm run build" and ensuring clean TypeScript compilation without warnings or errors.
```

### 3. Specific Files Expected to be Created or Modified
- `package.json`
- `tsconfig.json`
- `.gitignore`
- `.env.example`
- `.env`
- `src/server.ts`
- `src/app.ts`
- `src/config/env.config.ts`
- `src/utils/api-response.ts`
- `src/utils/api-error.ts`
- `src/middlewares/error.middleware.ts`
- `src/middlewares/not-found.middleware.ts`
- `src/routes/index.ts`
- `src/routes/health.routes.ts`

### 4. Detailed Implementation Requirements
- **Strict TypeScript:** No `any` types permitted. All Express handlers, middlewares, and return types must be explicitly typed.
- **Environment Validation:** `env.config.ts` must parse `process.env` immediately upon import and throw a formatted error detailing missing variables if validation fails.
- **Standardized Response Contract:**
  ```json
  // Success
  {
    "success": true,
    "data": { ... },
    "message": "Optional message"
  }

  // Error
  {
    "success": false,
    "error": {
      "code": "BAD_REQUEST",
      "message": "Invalid payload",
      "details": [ ... ]
    }
  }
  ```

### 5. Testing Requirements
1. Typecheck: Run `npx tsc --noEmit`
2. Build: Run `npm run build`
3. Launch: Run `npm run dev` in background
4. HTTP Probe: Execute `curl http://localhost:5000/api/health`

### 6. Expected Output
- `npx tsc --noEmit` exits with status `0` and empty output.
- `GET http://localhost:5000/api/health` returns HTTP `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "uptime": 1.25,
      "timestamp": "2026-11-23T16:35:00.000Z",
      "environment": "development"
    },
    "message": "Service is healthy"
  }
  ```

### 7. Completion Checklist
- [ ] `package.json` with all dependencies and build scripts created.
- [ ] `tsconfig.json` configured with strict mode options.
- [ ] `src/config/env.config.ts` validates environment variables with Zod.
- [ ] Standardized `ApiResponse` and `ApiError` utilities implemented.
- [ ] Centralized error middleware formats errors uniformly.
- [ ] Health-check endpoint operational at `/api/health`.
- [ ] TypeScript compilation passes cleanly (`npm run build`).

### 8. Phase Exit Gate
Do not proceed to Phase 2 until `npm run build` executes cleanly with zero TypeScript errors and the health endpoint returns `200 OK`.

---

## Phase 2: PostgreSQL and Prisma ORM Setup

### 1. Phase Objective
Install and configure Prisma ORM with PostgreSQL. Design a relational schema supporting users, chats, memberships, and an atomic 1-to-1 chat deduplication constraint. Create seed data and a database connection verification script.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 2 for the Chat Backend project: PostgreSQL and Prisma ORM Integration.

Implement the following:
1. Install Prisma dependencies:
   - Production: @prisma/client
   - Development: prisma
2. Initialize Prisma in the project:
   - Create prisma/schema.prisma targeting datasource db = postgresql
3. Define the relational schema in prisma/schema.prisma:
   - enum ChatType { ONE_TO_ONE, GROUP }
   - enum MemberRole { MEMBER, ADMIN }
   - model User:
     - id: String @id @default(uuid())
     - email: String @unique
     - name: String
     - createdAt: DateTime @default(now())
     - updatedAt: DateTime @updatedAt
     - memberships: ChatMember[]
   - model Chat:
     - id: String @id @default(uuid())
     - type: ChatType @default(ONE_TO_ONE)
     - name: String? (optional for group chats)
     - createdAt: DateTime @default(now())
     - updatedAt: DateTime @updatedAt
     - members: ChatMember[]
     - oneToOneLookup: OneToOneChatLookup?
   - model ChatMember:
     - id: String @id @default(uuid())
     - chatId: String
     - userId: String
     - role: MemberRole @default(MEMBER)
     - joinedAt: DateTime @default(now())
     - chat: Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
     - user: User @relation(fields: [userId], references: [id], onDelete: Cascade)
     - @@unique([chatId, userId])
     - @@index([userId])
     - @@index([chatId])
   - model OneToOneChatLookup:
     - id: String @id @default(uuid())
     - userLowId: String
     - userHighId: String
     - chatId: String @unique
     - chat: Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
     - @@unique([userLowId, userHighId])
     - @@index([userLowId, userHighId])
4. Create the Prisma client singleton in src/config/prisma.ts with query logging in development mode and proper graceful disconnection handling.
5. Create a database seed script in prisma/seed.ts:
   - Creates at least three deterministic test users:
     - User 1: { id: "usr_alice00000000000000000001", email: "alice@example.com", name: "Alice Smith" }
     - User 2: { id: "usr_bob0000000000000000000002", email: "bob@example.com", name: "Bob Jones" }
     - User 3: { id: "usr_charlie0000000000000003", email: "charlie@example.com", name: "Charlie Brown" }
   - Use upsert so it can be re-run safely.
6. Configure package.json:
   - Add prisma seed configuration:
     "prisma": { "seed": "ts-node prisma/seed.ts" }
   - Add scripts: "db:generate": "prisma generate", "db:migrate": "prisma migrate dev", "db:seed": "prisma db seed"
7. Create a database connectivity test script in src/scripts/test-db.ts that queries the User table and prints connection health.

Generate the Prisma Client and verify that the TypeScript models compile cleanly.
```

### 3. Specific Files Expected to be Created or Modified
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/config/prisma.ts`
- `src/scripts/test-db.ts`
- `package.json` (add scripts and prisma config)
- `.env` / `.env.example` (add `DATABASE_URL`)

### 4. Detailed Implementation Requirements
- **Atomic 1-to-1 Duplicate Prevention:**
  The `OneToOneChatLookup` table guarantees that for any two user IDs $A$ and $B$, sorting them lexicographically (`userLowId = min(A, B)` and `userHighId = max(A, B)`) produces a unique compound key `@@unique([userLowId, userHighId])`. This eliminates race conditions and duplicate chat rooms at the PostgreSQL engine level.
- **Cascade Deletion:** Ensure `onDelete: Cascade` is applied to `ChatMember` and `OneToOneChatLookup` so deleting a chat cleans up relational records cleanly.
- **Prisma Client Singleton:** Prevent multiple client instances during hot-reload by attaching the PrismaClient instance to `globalThis` in development.

### 5. Testing Requirements
1. Run `npx prisma generate`
2. Run database migration: `npx prisma migrate dev --name init_chat_schema` (or `npx prisma db push` if in development container)
3. Run database seed: `npm run db:seed`
4. Run connectivity script: `npx ts-node src/scripts/test-db.ts`

### 6. Expected Output
- Seed script prints:
  ```text
  [Seed] Successfully seeded 3 test users: Alice, Bob, Charlie.
  ```
- Test script exits code `0` with:
  ```text
  [DB Test] Database connection successful. User count: 3.
  ```

### 7. Completion Checklist
- [ ] `prisma/schema.prisma` contains User, Chat, ChatMember, and OneToOneChatLookup models.
- [ ] Unique constraints and indexes configured correctly.
- [ ] Prisma client singleton created in `src/config/prisma.ts`.
- [ ] Database seed script populated with 3 test users.
- [ ] Database migration and client generation executed without error.
- [ ] DB connection test script confirms successful connection.

### 8. Phase Exit Gate
Do not proceed to Phase 3 until PostgreSQL migrations are applied, the 3 seed users exist in the database, and `test-db.ts` succeeds.

---

## Phase 3: Firebase Admin SDK & Firestore Setup

### 1. Phase Objective
Integrate the Firebase Admin SDK to connect with Cloud Firestore. Define strict TypeScript interfaces for Firestore documents (messages, read receipts, last seen), configure credentials securely using environment variables or a service account key file, and implement an automated connection test script.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 3 for the Chat Backend project: Firebase Admin SDK and Firestore Setup.

Implement the following:
1. Install Firebase Admin SDK:
   - Production: firebase-admin
2. Define Firestore TypeScript data models and interfaces in src/types/firestore.types.ts:
   - FirestoreMessage:
     - id: string
     - chatId: string
     - senderId: string
     - text: string
     - createdAt: FirebaseFirestore.Timestamp
     - updatedAt?: FirebaseFirestore.Timestamp
     - isEdited?: boolean
     - isDeleted?: boolean
   - FirestoreReadReceipt:
     - userId: string
     - readAt: FirebaseFirestore.Timestamp
   - FirestoreLastSeen:
     - userId: string
     - messageId: string
     - updatedAt: FirebaseFirestore.Timestamp
3. Configure Firebase Admin in src/config/firebase.ts:
   - Support dual-mode authentication:
     Mode A: Service account JSON file specified via FIREBASE_SERVICE_ACCOUNT_PATH.
     Mode B: Direct environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY with escaped newlines handled properly: privateKey.replace(/\\n/g, '\n')).
   - Initialize app if admin.apps.length === 0.
   - Export firestore instance and FieldValue helper.
4. Update src/config/env.config.ts to validate Firebase environment variables:
   - Allow either FIREBASE_SERVICE_ACCOUNT_PATH OR (FIREBASE_PROJECT_ID and FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY).
5. Create Firestore collection reference helpers in src/constants/firestore.constants.ts:
   - Helper functions for paths:
     - chatMessagesCollection: (chatId: string) => `chats/${chatId}/messages`
     - messageReadsCollection: (chatId: string, messageId: string) => `chats/${chatId}/messages/${messageId}/reads`
     - chatLastSeenCollection: (chatId: string) => `chats/${chatId}/lastSeen`
6. Create an automated Firebase connection and write/read/delete test script in src/scripts/test-firebase.ts:
   - Writes a temporary ping document to _health_check/ping
   - Reads the document back and asserts equality
   - Deletes the test document
   - Exits with 0 on success or 1 on failure.

Verify with "npm run build" and execute "npx ts-node src/scripts/test-firebase.ts".
```

### 3. Specific Files Expected to be Created or Modified
- `src/config/firebase.ts`
- `src/types/firestore.types.ts`
- `src/constants/firestore.constants.ts`
- `src/config/env.config.ts` (updated)
- `src/scripts/test-firebase.ts`
- `.env` and `.env.example` (updated with Firebase keys)

### 4. Detailed Implementation Requirements
- **Firestore Document Path Standards:**
  - Messages: `chats/{chatId}/messages/{messageId}`
  - Message Reads: `chats/{chatId}/messages/{messageId}/reads/{userId}`
  - Last Seen State: `chats/{chatId}/lastSeen/{userId}`
- **Private Key Sanitation:** Firebase private keys from `.env` frequently include escaped literal `\n`. The config must transform:
  ```typescript
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  ```
- **Server Timestamps:** Always use `admin.firestore.FieldValue.serverTimestamp()` for message creation, read receipts, and last seen timestamps to prevent clock-skew errors across distributed clients.

### 5. Testing Requirements
1. Configure valid Firebase credentials in `.env`.
2. Run TypeScript build: `npm run build`
3. Execute connection test: `npx ts-node src/scripts/test-firebase.ts`

### 6. Expected Output
- Script executes and logs:
  ```text
  [Firebase Test] Connected to project: <your-project-id>
  [Firebase Test] Temporary write verified.
  [Firebase Test] Temporary read verified.
  [Firebase Test] Temporary cleanup verified.
  [Firebase Test] Firestore is fully operational.
  ```

### 7. Completion Checklist
- [ ] `firebase-admin` installed and configured.
- [ ] Strict types created for messages, read receipts, and last seen.
- [ ] Safe private key newline parsing implemented.
- [ ] Standardized Firestore collection path helpers created.
- [ ] Firebase health test script writes, reads, and deletes a test document.

### 8. Phase Exit Gate
Do not proceed to Phase 4 until Firestore connection is verified with `test-firebase.ts` returning exit code `0`.

---

## Phase 4: Create/Get Chat API (`POST /chat/create`)

### 1. Phase Objective
Implement the mandatory `POST /chat/create` endpoint. It accepts `userAId` and `userBId`, verifies both users exist in PostgreSQL, enforces atomic prevention of duplicate 1-to-1 chats, creates the relational `Chat`, `ChatMember`, and `OneToOneChatLookup` records inside a single transaction if no chat exists, and returns the existing or newly created `chatId`.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 4 for the Chat Backend project: Create/Get Chat API (POST /chat/create).

Implement the following:
1. Create request validation schema using Zod in src/validations/chat.validation.ts:
   - createChatSchema:
     - body: {
         userAId: z.string().min(1, "userAId is required"),
         userBId: z.string().min(1, "userBId is required")
       }
     - Refinement: userAId must NOT equal userBId ("Cannot create a chat with oneself").
2. Create generic validation middleware in src/middlewares/validate.middleware.ts:
   - validateRequest(schema: AnyZodSchema) validates req.body, req.params, and req.query. Passes formatted ZodError to next(error) on failure.
3. Create ChatService in src/services/chat.service.ts:
   - Method: getOrCreateOneToOneChat(userAId: string, userBId: string)
   - Step 1: Validate both users exist in PostgreSQL using Prisma. If either user does not exist, throw ApiError.notFound("One or both users not found").
   - Step 2: Sort IDs canonically:
     userLowId = userAId < userBId ? userAId : userBId;
     userHighId = userAId < userBId ? userBId : userAId;
   - Step 3: Check OneToOneChatLookup for [userLowId, userHighId].
     If found: Return existing chat with members and status isExisting: true.
   - Step 4: If not found, execute a Prisma interactive transaction ($transaction):
     - Create Chat record (type: ONE_TO_ONE)
     - Create ChatMember record for userAId (role: MEMBER)
     - Create ChatMember record for userBId (role: MEMBER)
     - Create OneToOneChatLookup record with userLowId, userHighId, and new chatId.
     - Return newly created chat with isExisting: false.
4. Create ChatController in src/controllers/chat.controller.ts:
   - createChat: Express handler calling chatService.getOrCreateOneToOneChat.
   - Return status 201 if created, 200 if already existing.
   - Response payload:
     {
       "success": true,
       "data": {
         "chatId": string,
         "type": "ONE_TO_ONE",
         "isExisting": boolean,
         "members": [
           { "userId": string, "name": string, "email": string, "role": string }
         ],
         "createdAt": string
       },
       "message": string
     }
5. Create routes in src/routes/chat.routes.ts:
   - POST /chat/create -> validateRequest(createChatSchema), chatController.createChat
6. Mount chat routes in src/routes/index.ts.
7. Create automated integration test script in src/scripts/test-phase4.ts:
   - Tests:
     Test 1: Call /chat/create with Alice and Bob -> Expect 201 Created and isExisting: false.
     Test 2: Call /chat/create with Alice and Bob again -> Expect 200 OK, same chatId, and isExisting: true.
     Test 3: Call /chat/create with Bob and Alice (reversed IDs) -> Expect 200 OK, same chatId.
     Test 4: Call with identical user IDs (userAId === userBId) -> Expect 400 Bad Request.
     Test 5: Call with non-existent user ID -> Expect 404 Not Found.

Run "npm run build" and run "npx ts-node src/scripts/test-phase4.ts".
```

### 3. Specific Files Expected to be Created or Modified
- `src/validations/chat.validation.ts`
- `src/middlewares/validate.middleware.ts`
- `src/services/chat.service.ts`
- `src/controllers/chat.controller.ts`
- `src/routes/chat.routes.ts`
- `src/routes/index.ts`
- `src/scripts/test-phase4.ts`

### 4. Detailed Implementation Requirements
- **Atomic Concurrency Handling:**
  In `ChatService.getOrCreateOneToOneChat`, wrap the creation inside `prisma.$transaction`. Handle potential Prisma unique constraint errors (`P2002` on `OneToOneChatLookup`) gracefully by catching the race condition and querying the existing chat.
- **Member Details in Return Object:**
  Include user profile details (ID, name, email) from the relational join so the caller gets full context immediately without additional roundtrips.

### 5. Testing Requirements
Execute the test script against the running server or in-memory Express instance:
```bash
npx ts-node src/scripts/test-phase4.ts
```

### 6. Expected Output
```text
[Phase 4 Test] Running Create/Get Chat tests...
✔ Test 1: New chat created between Alice & Bob (Status: 201, ChatId: 19e2...)
✔ Test 2: Idempotent duplicate check with same order (Status: 200, ChatId: 19e2..., isExisting: true)
✔ Test 3: Idempotent duplicate check with reversed order (Status: 200, ChatId: 19e2..., isExisting: true)
✔ Test 4: Same user ID rejected with 400 Bad Request
✔ Test 5: Non-existent user rejected with 404 Not Found
[Phase 4 Test] All 5 tests passed successfully!
```

### 7. Completion Checklist
- [ ] Zod schema validates `userAId` and `userBId` and forbids self-chat.
- [ ] `validateRequest` middleware handles Zod validation errors.
- [ ] `ChatService` checks existing chats via `OneToOneChatLookup`.
- [ ] Prisma transaction creates `Chat`, `ChatMember` entries, and `OneToOneChatLookup`.
- [ ] Handles duplicate chat calls idempotently (returns existing `chatId`).
- [ ] Automated test script validates all 5 positive and edge cases.

### 8. Phase Exit Gate
Do not proceed to Phase 5 until all 5 test cases in `test-phase4.ts` pass with zero failures.

---

## Phase 5: Send and Get Messages API

### 1. Phase Objective
Implement mandatory requirements 2 and 3:
1. `POST /chat/:chatId/message/send`: Validates sender is an active chat member in PostgreSQL, creates a message document in Firestore `chats/{chatId}/messages/{messageId}` with server timestamp, and returns message details.
2. `GET /chat/:chatId/messages?limit=50`: Validates chat exists, retrieves messages ordered chronologically by timestamp, supports pagination limit (default 50, max 100), and returns metadata.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 5 for the Chat Backend project: Send and Get Messages API.

Implement the following:
1. Create message validation schemas in src/validations/message.validation.ts:
   - sendMessageSchema:
     - params: { chatId: z.string().uuid("Invalid chat ID format") }
     - body: {
         senderId: z.string().min(1, "senderId is required"),
         text: z.string().trim().min(1, "Message text cannot be empty").max(5000, "Message text exceeds maximum length")
       }
   - getMessagesSchema:
     - params: { chatId: z.string().uuid("Invalid chat ID format") }
     - query: {
         limit: z.coerce.number().int().min(1).max(100).default(50),
         before: z.string().optional() // ISO string or cursor timestamp for pagination
       }
2. Create MessageService in src/services/message.service.ts:
   - Helper: verifyChatMembership(chatId: string, userId: string):
     - Query Prisma ChatMember for { chatId, userId }. If not found, throw ApiError.forbidden("User is not a member of this chat").
   - Method: sendMessage(chatId: string, senderId: string, text: string):
     - Verify sender is a member of the chat.
     - Generate Firestore document in collection `chats/${chatId}/messages`.
     - Data:
       - id: messageRef.id
       - chatId
       - senderId
       - text
       - createdAt: admin.firestore.FieldValue.serverTimestamp()
       - isEdited: false
       - isDeleted: false
     - Commit to Firestore.
     - Return formatted message response with ISO timestamp.
   - Method: getMessages(chatId: string, limit: number, before?: string):
     - Verify chat exists in PostgreSQL.
     - Build Firestore query on `chats/${chatId}/messages` ordered by createdAt desc with limit.
     - If before cursor is supplied, apply startAfter filter.
     - Execute query, reverse results so client receives them in chronological order (oldest to newest).
     - Return { messages, count, limit, hasMore }.
3. Create MessageController in src/controllers/message.controller.ts:
   - sendMessage: calls messageService.sendMessage, returns 201 Created.
   - getMessages: calls messageService.getMessages, returns 200 OK.
4. Mount routes in src/routes/chat.routes.ts:
   - POST /chat/:chatId/message/send -> validateRequest(sendMessageSchema), messageController.sendMessage
   - GET /chat/:chatId/messages -> validateRequest(getMessagesSchema), messageController.getMessages
5. Create automated test script in src/scripts/test-phase5.ts:
   - Test 1: Send message from Alice in valid chat -> 201 Created, returns messageId and timestamp.
   - Test 2: Send message from Bob in valid chat -> 201 Created.
   - Test 3: Send message from Charlie (non-member) in this chat -> 403 Forbidden.
   - Test 4: Send empty text message -> 400 Bad Request.
   - Test 5: Get messages for chat with limit=10 -> 200 OK, returns 2 messages ordered chronologically.

Run "npm run build" and run "npx ts-node src/scripts/test-phase5.ts".
```

### 3. Specific Files Expected to be Created or Modified
- `src/validations/message.validation.ts`
- `src/services/message.service.ts`
- `src/controllers/message.controller.ts`
- `src/routes/chat.routes.ts` (updated)
- `src/scripts/test-phase5.ts`

### 4. Detailed Implementation Requirements
- **Postgres Membership Guard:** Always verify that `senderId` belongs to `chatId` via Prisma before initiating any write to Firestore.
- **Timestamp Normalization:** When returning Firestore documents to Express clients, convert `Firestore.Timestamp` objects into standard ISO-8601 strings (`timestamp.toDate().toISOString()`) to ensure clean JSON serialization.
- **Chronological Sorting:** Firestore queries paginate most cleanly using `.orderBy('createdAt', 'desc').limit(N)`. The service must reverse the retrieved array before returning so frontends receive natural top-to-bottom reading order.

### 5. Testing Requirements
```bash
npx ts-node src/scripts/test-phase5.ts
```

### 6. Expected Output
```text
[Phase 5 Test] Running Send and Get Messages tests...
✔ Test 1: Message 1 sent by Alice (Status: 201, MessageId: 7Klm9...)
✔ Test 2: Message 2 sent by Bob (Status: 201, MessageId: Qw81p...)
✔ Test 3: Unauthorized sender (Charlie) rejected with 403 Forbidden
✔ Test 4: Empty text message rejected with 400 Bad Request
✔ Test 5: Retrieved 2 messages in chronological order (Alice first, then Bob)
[Phase 5 Test] All 5 tests passed successfully!
```

### 7. Completion Checklist
- [ ] Message validation schema rejects empty strings and non-UUID chat IDs.
- [ ] Membership verification checks PostgreSQL prior to Firestore writes.
- [ ] Messages saved to `chats/{chatId}/messages/{messageId}` with server timestamp.
- [ ] `GET /chat/:chatId/messages` returns messages ordered chronologically.
- [ ] Pagination limit supported and validated.
- [ ] All 5 automated tests pass.

### 8. Phase Exit Gate
Do not proceed to Phase 6 until `test-phase5.ts` passes and message storage in Firestore is verified.

---

## Phase 6: Read Receipts API (`POST /chat/:chatId/message/:messageId/read`)

### 1. Phase Objective
Implement mandatory requirement 4: `POST /chat/:chatId/message/:messageId/read`. It accepts `userId` in the body, validates that the user is an active member of the chat in PostgreSQL, validates that the message exists in Firestore, idempotently records the read receipt in Firestore under `chats/{chatId}/messages/{messageId}/reads/{userId}`, and returns confirmation.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 6 for the Chat Backend project: Read Receipts API.

Implement the following:
1. Create validation schema in src/validations/read-receipt.validation.ts:
   - markMessageAsReadSchema:
     - params: {
         chatId: z.string().uuid("Invalid chat ID format"),
         messageId: z.string().min(1, "messageId is required")
       }
     - body: {
         userId: z.string().min(1, "userId is required")
       }
2. Create ReadReceiptService in src/services/read-receipt.service.ts:
   - Method: markAsRead(chatId: string, messageId: string, userId: string):
     - Step 1: Verify chat membership using Prisma: Check if ChatMember exists for { chatId, userId }. If not, throw ApiError.forbidden("User is not a member of this chat").
     - Step 2: Verify message exists in Firestore: Check document `chats/${chatId}/messages/${messageId}`. If !doc.exists, throw ApiError.notFound("Message not found in this chat").
     - Step 3: Record read receipt in Firestore:
       Document path: `chats/${chatId}/messages/${messageId}/reads/${userId}`
       Data:
         - userId: string
         - readAt: admin.firestore.FieldValue.serverTimestamp()
       Use set with { merge: true } for idempotency (repeated calls will not create duplicates or fail).
     - Step 4: Return formatted receipt data:
       {
         "chatId": string,
         "messageId": string,
         "userId": string,
         "readAt": string (ISO timestamp)
       }
3. Create ReadReceiptController in src/controllers/read-receipt.controller.ts:
   - markAsRead: Express handler invoking readReceiptService.markAsRead, returns status 200 OK.
4. Mount route in src/routes/chat.routes.ts:
   - POST /chat/:chatId/message/:messageId/read -> validateRequest(markMessageAsReadSchema), readReceiptController.markAsRead
5. Create automated test script in src/scripts/test-phase6.ts:
   - Test 1: Bob marks Alice's message as read -> Expect 200 OK with receipt details.
   - Test 2: Repeat Bob marking Alice's message as read -> Expect 200 OK (idempotency test).
   - Test 3: Charlie (non-member) attempts to mark message as read -> Expect 403 Forbidden.
   - Test 4: Marking non-existent messageId as read -> Expect 404 Not Found.

Run "npm run build" and run "npx ts-node src/scripts/test-phase6.ts".
```

### 3. Specific Files Expected to be Created or Modified
- `src/validations/read-receipt.validation.ts`
- `src/services/read-receipt.service.ts`
- `src/controllers/read-receipt.controller.ts`
- `src/routes/chat.routes.ts` (updated)
- `src/scripts/test-phase6.ts`

### 4. Detailed Implementation Requirements
- **Target Subcollection:** Store receipts in `chats/{chatId}/messages/{messageId}/reads/{userId}`. Keying by `userId` guarantees idempotency without array concurrency mutations.
- **Membership & Message Checks:** Both constraints must be checked:
  1. Postgres: User must be in `ChatMember`.
  2. Firestore: Message must exist in `chats/{chatId}/messages/{messageId}`.

### 5. Testing Requirements
```bash
npx ts-node src/scripts/test-phase6.ts
```

### 6. Expected Output
```text
[Phase 6 Test] Running Read Receipts tests...
✔ Test 1: Bob marked Alice's message as read (Status: 200, Timestamp: 2026-11-23T...)
✔ Test 2: Idempotent repeat read receipt succeeded (Status: 200)
✔ Test 3: Non-member Charlie rejected with 403 Forbidden
✔ Test 4: Non-existent messageId rejected with 404 Not Found
[Phase 6 Test] All 4 tests passed successfully!
```

### 7. Completion Checklist
- [ ] Validation schema checks `chatId`, `messageId`, and `userId`.
- [ ] Verifies user is a member of the chat via PostgreSQL.
- [ ] Verifies target message exists in Firestore.
- [ ] Stores read receipt idempotently under `reads/{userId}`.
- [ ] All 4 automated test cases pass.

### 8. Phase Exit Gate
Do not proceed to Phase 7 until `test-phase6.ts` passes with zero failures.

---

## Phase 7: Last Seen Message API (`POST /chat/:chatId/lastseen`)

### 1. Phase Objective
Implement mandatory requirement 5: `POST /chat/:chatId/lastseen`. It accepts `userId` and `messageId` in the body, validates that the user is an active chat member, validates that the message exists in Firestore, updates the user's last-seen pointer in Firestore document `chats/{chatId}/lastSeen/{userId}`, and returns the updated state.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 7 for the Chat Backend project: Update Last Seen Message API.

Implement the following:
1. Create validation schema in src/validations/last-seen.validation.ts:
   - updateLastSeenSchema:
     - params: {
         chatId: z.string().uuid("Invalid chat ID format")
       }
     - body: {
         userId: z.string().min(1, "userId is required"),
         messageId: z.string().min(1, "messageId is required")
       }
2. Create LastSeenService in src/services/last-seen.service.ts:
   - Method: updateLastSeen(chatId: string, userId: string, messageId: string):
     - Step 1: Verify chat membership in PostgreSQL via Prisma ChatMember. If not found, throw ApiError.forbidden("User is not a member of this chat").
     - Step 2: Verify message exists in Firestore at `chats/${chatId}/messages/${messageId}`.
       If !doc.exists, throw ApiError.notFound("Message not found in this chat").
     - Step 3: Write/Upsert last seen pointer in Firestore:
       Document path: `chats/${chatId}/lastSeen/${userId}`
       Data:
         - userId: string
         - messageId: string
         - updatedAt: admin.firestore.FieldValue.serverTimestamp()
     - Step 4: Return formatted payload:
       {
         "chatId": string,
         "userId": string,
         "lastSeenMessageId": string,
         "updatedAt": string (ISO timestamp)
       }
   - Method: getLastSeen(chatId: string, userId: string):
     - Helper method to retrieve current last seen message state for a user.
3. Create LastSeenController in src/controllers/last-seen.controller.ts:
   - updateLastSeen: Express handler calling lastSeenService.updateLastSeen, returns status 200 OK.
4. Mount route in src/routes/chat.routes.ts:
   - POST /chat/:chatId/lastseen -> validateRequest(updateLastSeenSchema), lastSeenController.updateLastSeen
5. Create automated test script in src/scripts/test-phase7.ts:
   - Test 1: Update last seen for Bob with valid messageId -> Expect 200 OK with lastSeenMessageId.
   - Test 2: Update last seen with an invalid/fake messageId -> Expect 404 Not Found.
   - Test 3: Update last seen for non-member user -> Expect 403 Forbidden.
   - Test 4: Update last seen with invalid chatId -> Expect 400 Bad Request.

Run "npm run build" and run "npx ts-node src/scripts/test-phase7.ts".
```

### 3. Specific Files Expected to be Created or Modified
- `src/validations/last-seen.validation.ts`
- `src/services/last-seen.service.ts`
- `src/controllers/last-seen.controller.ts`
- `src/routes/chat.routes.ts` (updated)
- `src/scripts/test-phase7.ts`

### 4. Detailed Implementation Requirements
- **Atomic Pointer Document:** The document `chats/{chatId}/lastSeen/{userId}` maintains the cursor for that user in that chat. It avoids rewriting message documents or updating relational rows repeatedly.
- **Referential Integrity Validation:** The service MUST check that `messageId` exists inside the given `chatId` in Firestore before saving the last-seen pointer.

### 5. Testing Requirements
```bash
npx ts-node src/scripts/test-phase7.ts
```

### 6. Expected Output
```text
[Phase 7 Test] Running Last Seen API tests...
✔ Test 1: Bob updated last seen message (Status: 200, LastSeenId: Qw81p...)
✔ Test 2: Invalid messageId rejected with 404 Not Found
✔ Test 3: Non-member Charlie rejected with 403 Forbidden
✔ Test 4: Malformed chatId rejected with 400 Bad Request
[Phase 7 Test] All 4 tests passed successfully!
```

### 7. Completion Checklist
- [ ] Schema validates `chatId`, `userId`, and `messageId`.
- [ ] Verifies user membership in PostgreSQL.
- [ ] Verifies message exists in Firestore.
- [ ] Upserts `chats/{chatId}/lastSeen/{userId}`.
- [ ] Rejects non-existent message IDs with 404.
- [ ] All 4 automated test cases pass.

### 8. Phase Exit Gate
Do not proceed to Phase 8 until `test-phase7.ts` passes with zero failures.

---

## Phase 8: User Chats API (`GET /user/:userId/chats`)

### 1. Phase Objective
Implement mandatory requirement 6: `GET /user/:userId/chats`. It validates the user exists in PostgreSQL, fetches all chats the user belongs to along with all member details from PostgreSQL, augments each chat with its latest message from Firestore (`chats/{chatId}/messages` ordered by `createdAt desc` limit 1), handles users with no chats gracefully, and returns the compiled chat list.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 8 for the Chat Backend project: List User Chats API (GET /user/:userId/chats).

Implement the following:
1. Create validation schema in src/validations/user.validation.ts:
   - getUserChatsSchema:
     - params: {
         userId: z.string().min(1, "userId is required")
       }
2. Create UserChatService in src/services/user-chat.service.ts:
   - Method: getUserChats(userId: string):
     - Step 1: Verify user exists in PostgreSQL via Prisma User. If not found, throw ApiError.notFound("User not found").
     - Step 2: Query Prisma for all chats where members include userId:
       Find ChatMember records with userId, including:
         - chat: {
             include: {
               members: {
                 include: {
                   user: {
                     select: { id: true, name: true, email: true }
                   }
                 }
               }
             }
           }
       Order by chat.updatedAt desc.
     - Step 3: For each chat, fetch the latest message preview from Firestore:
       Query collection `chats/${chat.id}/messages` ordered by createdAt desc limit 1.
       If message exists, extract { id, senderId, text, createdAt }.
       If no messages exist, set lastMessage: null.
     - Step 4: For each chat, fetch the user's lastSeen state from Firestore:
       Read document `chats/${chat.id}/lastSeen/${userId}`.
       If exists, extract { messageId, updatedAt }.
     - Step 5: Format response data array:
       [
         {
           "chatId": string,
           "type": "ONE_TO_ONE" | "GROUP",
           "name": string | null,
           "createdAt": string,
           "updatedAt": string,
           "members": [
             { "userId": string, "name": string, "email": string, "role": string, "joinedAt": string }
           ],
           "lastMessage": {
             "id": string,
             "senderId": string,
             "text": string,
             "createdAt": string
           } | null,
           "lastSeen": {
             "messageId": string,
             "updatedAt": string
           } | null
         }
       ]
3. Create UserController in src/controllers/user.controller.ts:
   - getUserChats: Express handler calling userChatService.getUserChats, returns 200 OK.
4. Create user routes in src/routes/user.routes.ts:
   - GET /user/:userId/chats -> validateRequest(getUserChatsSchema), userController.getUserChats
5. Mount user routes in src/routes/index.ts.
6. Create automated test script in src/scripts/test-phase8.ts:
   - Test 1: Fetch chats for Alice -> Expect 200 OK, returns chat with Bob, members list, and lastMessage populated.
   - Test 2: Fetch chats for Bob -> Expect 200 OK, returns same chat with lastSeen populated from Phase 7.
   - Test 3: Fetch chats for Charlie (user with no chats) -> Expect 200 OK with empty array [].
   - Test 4: Fetch chats for non-existent userId -> Expect 404 Not Found.

Run "npm run build" and run "npx ts-node src/scripts/test-phase8.ts".
```

### 3. Specific Files Expected to be Created or Modified
- `src/validations/user.validation.ts`
- `src/services/user-chat.service.ts`
- `src/controllers/user.controller.ts`
- `src/routes/user.routes.ts`
- `src/routes/index.ts` (updated)
- `src/scripts/test-phase8.ts`

### 4. Detailed Implementation Requirements
- **Hybrid Data Aggregation:**
  Execute PostgreSQL relation queries to retrieve chat structure and member profiles, then fan out via `Promise.all` across Firestore to fetch each chat's latest message snippet concurrently.
- **Empty State Safety:** If a user has no active chats, return an empty array `[]` with HTTP `200 OK`, not a 404.
- **Non-existent User Check:** Distinctly differentiate between "User does not exist" (return HTTP 404) and "User has zero chats" (return HTTP 200 with `[]`).

### 5. Testing Requirements
```bash
npx ts-node src/scripts/test-phase8.ts
```

### 6. Expected Output
```text
[Phase 8 Test] Running User Chats API tests...
✔ Test 1: Alice's chats retrieved (Status: 200, 1 chat found, lastMessage verified)
✔ Test 2: Bob's chats retrieved (Status: 200, lastSeen pointer verified)
✔ Test 3: Charlie (zero chats) returned empty array [] with 200 OK
✔ Test 4: Non-existent user rejected with 404 Not Found
[Phase 8 Test] All 4 tests passed successfully!
```

### 7. Completion Checklist
- [ ] Schema validates `userId` parameter.
- [ ] Relational queries fetch chats and member metadata from PostgreSQL.
- [ ] Concurrently fetches latest message from Firestore for each chat.
- [ ] Fetches last seen message pointer from Firestore.
- [ ] Handles zero-chat users gracefully with `[]`.
- [ ] Rejects unknown users with 404.
- [ ] All 4 automated test cases pass.

### 8. Phase Exit Gate
Do not proceed to Phase 9 until `test-phase8.ts` passes with zero failures.

---

## Phase 9: Security, Validation, Centralized Errors & Automated E2E Testing

### 1. Phase Objective
Harden the application across all endpoints: add rate limiting, security headers, comprehensive input sanitization, and full exception mapping for Prisma and Firestore. Implement an automated end-to-end integration test suite that exercises all 6 mandatory requirements sequentially in a single automated run.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 9 for the Chat Backend project: Security, Validation, and Master E2E Testing.

Implement the following:
1. Install rate limiting package:
   - Production: express-rate-limit
2. Configure security and rate limiting in src/middlewares/security.middleware.ts:
   - General API limiter: 100 requests per 15 minutes per IP.
   - Message send limiter: 30 requests per minute per IP to prevent spam.
3. Enhance centralized error handler in src/middlewares/error.middleware.ts:
   - Handle Prisma known errors:
     - P2002: Unique constraint violation -> 409 Conflict ("Resource already exists")
     - P2025: Record not found -> 404 Not Found
     - P2003: Foreign key constraint failure -> 400 Bad Request
   - Handle Firebase Admin errors (permission-denied, not-found, unavailable).
   - Handle Zod validation errors with field-level error messages.
   - Mask internal stack traces in production mode.
4. Create a comprehensive, standalone Master E2E Test Suite in src/scripts/run-e2e-tests.ts:
   The script must test the entire lifecycle end-to-end without external tools:
   - Step 1: Health check endpoint (/api/health)
   - Step 2: Create chat between Alice and Bob (POST /chat/create) -> 201 Created
   - Step 3: Duplicate chat check (POST /chat/create with Bob and Alice) -> 200 OK (same chatId)
   - Step 4: Send message 1 from Alice (POST /chat/:chatId/message/send) -> 201 Created
   - Step 5: Send message 2 from Bob (POST /chat/:chatId/message/send) -> 201 Created
   - Step 6: Unauthorized send from Charlie (non-member) -> 403 Forbidden
   - Step 7: Get messages for chat (GET /chat/:chatId/messages?limit=10) -> 200 OK, verify 2 messages in order
   - Step 8: Mark message 1 as read by Bob (POST /chat/:chatId/message/:messageId/read) -> 200 OK
   - Step 9: Duplicate read receipt test -> 200 OK (idempotent)
   - Step 10: Update last seen message for Bob (POST /chat/:chatId/lastseen) -> 200 OK
   - Step 11: Update last seen with invalid messageId -> 404 Not Found
   - Step 12: List chats for Alice (GET /user/:userId/chats) -> 200 OK, verify last message preview
   - Step 13: List chats for Charlie (user with no chats) -> 200 OK, empty array []
   - Step 14: Non-existent user chat listing -> 404 Not Found
5. Add npm script to package.json:
   "test:e2e": "ts-node src/scripts/run-e2e-tests.ts"

Run "npm run build" and execute "npm run test:e2e".
```

### 3. Specific Files Expected to be Created or Modified
- `src/middlewares/security.middleware.ts`
- `src/middlewares/error.middleware.ts` (enhanced)
- `src/scripts/run-e2e-tests.ts`
- `src/app.ts` (mount rate limiters)
- `package.json` (add `test:e2e` script)

### 4. Detailed Implementation Requirements
- **Prisma Error Code Mapping:**
  Map Prisma's `PrismaClientKnownRequestError` codes to appropriate HTTP status codes:
  - `P2002` $\rightarrow$ 409 Conflict
  - `P2025` $\rightarrow$ 404 Not Found
  - `P2003` $\rightarrow$ 400 Bad Request
- **E2E Automation Independence:** `run-e2e-tests.ts` must instantiate the Express app directly using Supertest or `node-fetch` / `axios` against a local test port, resetting or working with deterministic seeded user IDs so tests run consistently in any environment.

### 5. Testing Requirements
```bash
npm run test:e2e
```

### 6. Expected Output
```text
==================================================
CHAT BACKEND - MASTER END-TO-END VERIFICATION SUITE
==================================================
✔ [01/14] Health check endpoint operational (200 OK)
✔ [02/14] Create chat Alice & Bob returns 201 Created
✔ [03/14] Duplicate chat creation returns 200 OK with identical chatId
✔ [04/14] Alice sends Message 1 successfully (201 Created)
✔ [05/14] Bob sends Message 2 successfully (201 Created)
✔ [06/14] Unauthorized message by Charlie rejected (403 Forbidden)
✔ [07/14] Get messages returns 2 messages in chronological order (200 OK)
✔ [08/14] Bob marks Message 1 as read (200 OK)
✔ [09/14] Repeated read receipt is idempotent (200 OK)
✔ [10/14] Bob updates last seen to Message 2 (200 OK)
✔ [11/14] Last seen with fake messageId rejected (404 Not Found)
✔ [12/14] List chats for Alice shows chat with Bob and latest message (200 OK)
✔ [13/14] List chats for zero-chat user returns empty array (200 OK)
✔ [14/14] List chats for unknown user rejected (404 Not Found)
==================================================
RESULT: ALL 14 E2E TEST ASSERTIONS PASSED (100%)
==================================================
```

### 7. Completion Checklist
- [ ] Rate limiting middleware applied to API endpoints.
- [ ] Prisma errors mapped to standard HTTP statuses.
- [ ] Firestore and Zod errors handled uniformly.
- [ ] Master E2E test script covers all 6 mandatory requirements.
- [ ] `npm run test:e2e` executes with 100% pass rate.

### 8. Phase Exit Gate
Do not proceed to Phase 10 until all 14 assertions in `npm run test:e2e` pass with zero errors.

---

## Phase 10: Final Documentation, Postman Collection & Submission Readiness

### 1. Phase Objective
Produce complete, submission-grade project documentation: a comprehensive `README.md`, environment setup guide, database migration instructions, architecture explanation, full API documentation with curl examples, and an exportable Postman Collection JSON file.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 10 for the Chat Backend project: Final Documentation and Submission Preparation.

Implement the following:
1. Create a comprehensive, production-ready README.md containing:
   - Project Title & Overview
   - Technology Stack details (Node.js, TypeScript strict mode, Express, PostgreSQL + Prisma, Firebase Admin Firestore, Zod)
   - Architecture & Dual-Store Strategy (Relational vs. NoSQL division of responsibilities)
   - Database Schema Diagrams and ER explanation
   - Firestore Collections and Document Hierarchy
   - Step-by-Step Setup Guide:
     - Prerequisites (Node.js v18+, PostgreSQL, Firebase Project)
     - Environment configuration (.env setup with details for every key)
     - Database migration and seed execution commands
     - Build and run commands (dev, build, start)
     - Automated test execution commands (npm run test:e2e)
   - Complete API Reference with curl examples, request headers, request bodies, and JSON responses for all 6 mandatory endpoints:
     1. POST /chat/create
     2. POST /chat/:chatId/message/send
     3. GET /chat/:chatId/messages?limit=50
     4. POST /chat/:chatId/message/:messageId/read
     5. POST /chat/:chatId/lastseen
     6. GET /user/:userId/chats
   - Error handling convention documentation.
2. Create an exportable Postman Collection JSON file at postman/chat-backend.postman_collection.json:
   - Includes all 6 mandatory endpoints with realistic sample payloads and variables:
     - {{baseUrl}} default: http://localhost:5000
     - {{userAId}}, {{userBId}}, {{chatId}}, {{messageId}}
   - Includes pre-request scripts or sample test assertions for status codes.
3. Verify that:
   - .env.example contains all required environment keys with clear documentation.
   - dist directory is cleaned and rebuilt cleanly with "npm run build".
   - No temporary logs or credentials are committed.

Run "npm run build" to confirm final project build integrity.
```

### 3. Specific Files Expected to be Created or Modified
- `README.md`
- `postman/chat-backend.postman_collection.json`
- `.env.example` (verified complete)
- `dist/` (fresh production build)

### 4. Detailed Implementation Requirements
- **Curl Commands in README:** Every endpoint must have an executable curl snippet that can be pasted directly into a terminal with realistic UUIDs.
- **Postman Collection Schema v2.1.0:** The Postman file must be valid JSON adhering to the Postman Collection v2.1 format so evaluators can import it with a single click.

### 5. Testing Requirements
1. Validate JSON syntax of `postman/chat-backend.postman_collection.json`.
2. Execute full build: `npm run build`.
3. Execute E2E tests: `npm run test:e2e`.

### 6. Expected Output
- `README.md` is complete, readable, and beautifully formatted.
- Postman collection imports cleanly into Postman without format warnings.
- `npm run build` succeeds with zero errors.

### 7. Completion Checklist
- [ ] `README.md` covers architecture, setup, and full API documentation.
- [ ] Postman collection JSON created with all endpoints and sample payloads.
- [ ] `.env.example` matches all environment variables in code.
- [ ] Final TypeScript build executes cleanly.
- [ ] All mandatory assignment requirements verified complete.

### 8. Phase Exit Gate
At this point, all mandatory assignment requirements are 100% complete, tested, and documented. Stop here and submit unless explicit time permits proceeding to optional phases.

---

## Phase 11 (Optional): Group Chat Creation and Management

> [!NOTE]
> Execute Phase 11 ONLY after Phases 1 through 10 are completely verified and approved.

### 1. Phase Objective
Extend the backend with group chat capabilities:
1. `POST /chat/group/create`: Create a group chat with a group name, creator (assigned `ADMIN` role), and initial member list.
2. `POST /chat/:chatId/member/add`: Add a new member to an existing group chat (requires `ADMIN` role).
3. `POST /chat/:chatId/member/remove`: Remove a member from a group chat (requires `ADMIN` role).

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 11 for the Chat Backend project: Group Chat Creation and Management (Optional Feature).

Implement the following:
1. Create validation schemas in src/validations/group-chat.validation.ts:
   - createGroupChatSchema:
     - body: {
         name: z.string().trim().min(1, "Group name is required").max(100),
         creatorId: z.string().min(1, "creatorId is required"),
         memberIds: z.array(z.string()).min(1, "At least one additional member is required")
       }
   - addGroupMemberSchema:
     - params: { chatId: z.string().uuid() }
     - body: {
         adminId: z.string().min(1, "adminId is required"),
         userIdToAdd: z.string().min(1, "userIdToAdd is required")
       }
   - removeGroupMemberSchema:
     - params: { chatId: z.string().uuid() }
     - body: {
         adminId: z.string().min(1, "adminId is required"),
         userIdToRemove: z.string().min(1, "userIdToRemove is required")
       }
2. Extend ChatService in src/services/chat.service.ts with group management methods:
   - createGroupChat(name: string, creatorId: string, memberIds: string[]):
     - Validate creator and all memberIds exist in PostgreSQL.
     - Execute Prisma transaction:
       - Create Chat with type: GROUP and name.
       - Create ChatMember for creatorId with role: ADMIN.
       - Create ChatMember for each memberId with role: MEMBER.
       - Return chat details with all members.
   - addGroupMember(chatId: string, adminId: string, userIdToAdd: string):
     - Verify chat is of type GROUP.
     - Verify adminId has role: ADMIN in this chat.
     - Check if userIdToAdd is already a member (throw 409 Conflict if so).
     - Create ChatMember with role: MEMBER.
   - removeGroupMember(chatId: string, adminId: string, userIdToRemove: string):
     - Verify chat is of type GROUP.
     - Verify adminId has role: ADMIN.
     - Cannot remove the group creator/admin if they are the sole admin.
     - Delete ChatMember record for userIdToRemove.
3. Create GroupChatController in src/controllers/group-chat.controller.ts and wire endpoints:
   - POST /chat/group/create
   - POST /chat/:chatId/member/add
   - POST /chat/:chatId/member/remove
4. Mount routes in src/routes/chat.routes.ts.
5. Create automated test script in src/scripts/test-phase11.ts:
   - Test 1: Alice creates group "Project Team" with Bob and Charlie -> 201 Created.
   - Test 2: Alice adds a new user to the group -> 200 OK.
   - Test 3: Non-admin Bob attempts to add member -> 403 Forbidden.
   - Test 4: Alice removes Bob from the group -> 200 OK.

Run "npm run build" and run "npx ts-node src/scripts/test-phase11.ts".
```

### 3. Specific Files Expected to be Created or Modified
- `src/validations/group-chat.validation.ts`
- `src/controllers/group-chat.controller.ts`
- `src/services/chat.service.ts` (extended)
- `src/routes/chat.routes.ts` (updated)
- `src/scripts/test-phase11.ts`

### 4. Completion Checklist
- [ ] Group creation validates creator and all members exist.
- [ ] Creator assigned `ADMIN` role; members assigned `MEMBER` role.
- [ ] Admin authorization enforced for member additions and removals.
- [ ] Automated tests in `test-phase11.ts` pass cleanly.

---

## Phase 12 (Optional): Message Edit and Soft Delete

> [!NOTE]
> Execute Phase 12 ONLY after Phase 11 is complete or if message modification is explicitly prioritized.

### 1. Phase Objective
Extend Firestore messaging with edit and delete operations:
1. `PATCH /chat/:chatId/message/:messageId`: Allows the original sender to edit their message text. Sets `isEdited: true` and `updatedAt: serverTimestamp()`.
2. `DELETE /chat/:chatId/message/:messageId`: Allows the original sender or group admin to soft-delete a message. Sets `isDeleted: true`, clears text, and updates timestamp.

### 2. Exact Copy-Paste Prompt for Antigravity CLI

```text
Execute Phase 12 for the Chat Backend project: Message Edit and Soft Delete (Optional Feature).

Implement the following:
1. Create validation schemas in src/validations/message-mutation.validation.ts:
   - editMessageSchema:
     - params: {
         chatId: z.string().uuid(),
         messageId: z.string().min(1)
       }
     - body: {
         userId: z.string().min(1, "userId is required"),
         newText: z.string().trim().min(1, "Message text cannot be empty").max(5000)
       }
   - deleteMessageSchema:
     - params: {
         chatId: z.string().uuid(),
         messageId: z.string().min(1)
       }
     - body: {
         userId: z.string().min(1, "userId is required")
       }
2. Extend MessageService in src/services/message.service.ts:
   - Method: editMessage(chatId: string, messageId: string, userId: string, newText: string):
     - Read message from Firestore `chats/${chatId}/messages/${messageId}`.
     - If !doc.exists, throw ApiError.notFound("Message not found").
     - If message.isDeleted, throw ApiError.badRequest("Cannot edit a deleted message").
     - Verify sender: if message.senderId !== userId, throw ApiError.forbidden("Only the sender can edit this message").
     - Update Firestore document:
       - text: newText
       - isEdited: true
       - updatedAt: admin.firestore.FieldValue.serverTimestamp()
     - Return updated message.
   - Method: deleteMessage(chatId: string, messageId: string, userId: string):
     - Read message from Firestore.
     - If !doc.exists, throw ApiError.notFound("Message not found").
     - Check permissions: User must be sender OR an ADMIN in the chat (check Prisma ChatMember role).
     - If neither, throw ApiError.forbidden("You do not have permission to delete this message").
     - Soft delete in Firestore:
       - text: "[This message was deleted]"
       - isDeleted: true
       - updatedAt: admin.firestore.FieldValue.serverTimestamp()
     - Return confirmation.
3. Create controller handlers and mount routes:
   - PATCH /chat/:chatId/message/:messageId -> validateRequest(editMessageSchema), messageController.editMessage
   - DELETE /chat/:chatId/message/:messageId -> validateRequest(deleteMessageSchema), messageController.deleteMessage
4. Create automated test script in src/scripts/test-phase12.ts:
   - Test 1: Sender Alice edits her message -> 200 OK, isEdited: true.
   - Test 2: Bob tries to edit Alice's message -> 403 Forbidden.
   - Test 3: Alice soft-deletes her message -> 200 OK, isDeleted: true, text masked.
   - Test 4: Editing a deleted message -> 400 Bad Request.

Run "npm run build" and run "npx ts-node src/scripts/test-phase12.ts".
```

### 3. Specific Files Expected to be Created or Modified
- `src/validations/message-mutation.validation.ts`
- `src/services/message.service.ts` (extended)
- `src/controllers/message.controller.ts` (extended)
- `src/routes/chat.routes.ts` (updated)
- `src/scripts/test-phase12.ts`

### 4. Completion Checklist
- [ ] Message edit validates ownership (only original sender).
- [ ] Message delete supports soft deletion and hides deleted content.
- [ ] Editing deleted messages is prevented.
- [ ] Automated tests in `test-phase12.ts` pass cleanly.

---

## Verification & Transition Matrix

| Phase | Core Deliverable | Verification Command | Gate Condition to Advance |
| :--- | :--- | :--- | :--- |
| **Phase 1** | TS Strict Config, Express, Error & Response Wrappers | `npm run build && curl http://localhost:5000/api/health` | Zero TS compiler errors; health endpoint returns 200 OK |
| **Phase 2** | Prisma Schema, Relational Models, Seed Data | `npm run db:seed && npx ts-node src/scripts/test-db.ts` | 3 test users seeded; DB connectivity verified |
| **Phase 3** | Firebase Admin SDK, Firestore Models & Paths | `npx ts-node src/scripts/test-firebase.ts` | Temporary Firestore read/write/delete succeeds |
| **Phase 4** | `POST /chat/create` (Atomic 1-to-1 Deduping) | `npx ts-node src/scripts/test-phase4.ts` | 5/5 test assertions pass (201 created, 200 existing, 400 self-chat) |
| **Phase 5** | `POST /chat/:id/message/send`, `GET /chat/:id/messages` | `npx ts-node src/scripts/test-phase5.ts` | 5/5 test assertions pass (membership guard, chronological order) |
| **Phase 6** | `POST /chat/:id/message/:id/read` | `npx ts-node src/scripts/test-phase6.ts` | 4/4 test assertions pass (idempotent read receipt) |
| **Phase 7** | `POST /chat/:id/lastseen` | `npx ts-node src/scripts/test-phase7.ts` | 4/4 test assertions pass (cursor upsert, 404 fake message) |
| **Phase 8** | `GET /user/:id/chats` (Hybrid Aggregation) | `npx ts-node src/scripts/test-phase8.ts` | 4/4 test assertions pass (members, last message, empty array) |
| **Phase 9** | Security, Error Handlers & Master E2E Suite | `npm run test:e2e` | 14/14 master E2E assertions pass (100% pass rate) |
| **Phase 10** | README.md, Postman Collection, Final Build | `npm run build` | Full production build clean; Postman JSON verified |
| **Phase 11** | *(Optional)* Group Chat Creation & Management | `npx ts-node src/scripts/test-phase11.ts` | Group creation and admin access control verified |
| **Phase 12** | *(Optional)* Message Edit and Soft Delete | `npx ts-node src/scripts/test-phase12.ts` | Sender ownership and soft-delete verified |
