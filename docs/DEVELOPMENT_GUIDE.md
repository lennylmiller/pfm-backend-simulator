# Development Guide

## Getting Started

### Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL 14+
- npm or yarn
- Git

### Initial Setup

1. **Clone repository**:
   ```bash
   git clone https://github.com/lennylmiller/pfm-backend-simulator.git
   cd pfm-backend-simulator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start PostgreSQL**:
   ```bash
   # Option A: Docker Compose
   docker-compose up -d postgres

   # Option B: Local PostgreSQL
   # Ensure PostgreSQL is running on port 5432
   ```

5. **Initialize database**:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

6. **Seed test data** (optional):
   ```bash
   npm run seed -- generate --scenario realistic
   ```

7. **Start development server**:
   ```bash
   npm run dev
   ```

8. **Verify setup**:
   ```bash
   curl http://localhost:3000/health
   # Expected: {"status":"ok","timestamp":"..."}
   ```

## Development Workflow

### Daily Development

1. **Start server**:
   ```bash
   npm run dev
   ```
   - Hot reload enabled (nodemon)
   - Watches for TypeScript changes
   - Auto-restarts on file changes

2. **Run tests** (in separate terminal):
   ```bash
   npm run test:watch
   ```
   - Watch mode for TDD
   - Auto-runs on file changes

3. **View database** (optional):
   ```bash
   npm run prisma:studio
   ```
   - Opens Prisma Studio at `http://localhost:5555`
   - Visual database browser

### Code Quality

**Before committing**:
```bash
npm run lint           # Check for linting errors
npm run format         # Format code with Prettier
npm test               # Run all tests
npm run build          # Verify TypeScript compiles
```

**Fix linting issues**:
```bash
npx eslint src/**/*.ts --fix
```

**Format all files**:
```bash
npm run format
```

## Adding New Features

### 1. Adding a New Endpoint

Follow the layered architecture pattern:

#### Step 1: Define Route

**File**: `src/routes/{domain}.ts`

```typescript
// Example: src/routes/users.ts
import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as usersController from '../controllers/usersController';

const router = Router();

// New endpoint
router.get('/current', authenticateJWT, usersController.getCurrentUser);
router.put('/current', authenticateJWT, usersController.updateCurrentUser);

export default router;
```

#### Step 2: Create Controller

**File**: `src/controllers/{domain}Controller.ts`

```typescript
// Example: src/controllers/usersController.ts
import { Request, Response } from 'express';
import { userService } from '../services/userService';
import { logger } from '../config/logger';

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // 1. Extract user from context (set by auth middleware)
    const { userId } = req.context!;

    // 2. Call service
    const user = await userService.getUserById(userId);

    // 3. Handle not found
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 4. Return response
    return res.json({ user });
  } catch (error) {
    // 5. Error handling
    logger.error({ error }, 'Failed to get current user');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCurrentUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.context!;
    const { user: updateData } = req.body;

    const updatedUser = await userService.updateUser(userId, updateData);

    return res.json({ user: updatedUser });
  } catch (error) {
    logger.error({ error }, 'Failed to update user');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### Step 3: Implement Service

**File**: `src/services/{domain}Service.ts`

```typescript
// Example: src/services/userService.ts
import { prisma } from '../config/database';

export const userService = {
  async getUserById(userId: string) {
    return await prisma.user.findUnique({
      where: {
        id: BigInt(userId),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        timezone: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async updateUser(userId: string, data: any) {
    return await prisma.user.update({
      where: {
        id: BigInt(userId),
      },
      data: {
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone,
        timezone: data.timezone,
        preferences: data.preferences,
        updatedAt: new Date(),
      },
    });
  },
};
```

#### Step 4: Write Tests

**File**: `tests/integration/{domain}.test.ts`

```typescript
// Example: tests/integration/users.test.ts
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import jwt from 'jsonwebtoken';

describe('User Endpoints', () => {
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        partnerId: BigInt(1),
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    // Generate JWT
    authToken = jwt.sign(
      {
        userId: testUser.id.toString(),
        partnerId: testUser.partnerId.toString(),
      },
      process.env.JWT_SECRET!
    );
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  describe('GET /users/current', () => {
    it('should return current user', async () => {
      const response = await request(app)
        .get('/api/v2/users/current')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v2/users/current');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /users/current', () => {
    it('should update user data', async () => {
      const response = await request(app)
        .put('/api/v2/users/current')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user: {
            first_name: 'Updated',
            last_name: 'Name',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.user.firstName).toBe('Updated');
    });
  });
});
```

#### Step 5: Run Tests

```bash
npm test -- users.test.ts
```

### 2. Adding a Database Field

#### Step 1: Update Prisma Schema

**File**: `prisma/schema.prisma`

```prisma
model User {
  id                    BigInt    @id @default(autoincrement())
  // ... existing fields ...
  avatarUrl             String?   @map("avatar_url")  // New field
  updatedAt             DateTime  @updatedAt @map("updated_at")

  @@map("users")
}
```

#### Step 2: Generate Migration

```bash
npx prisma migrate dev --name add_user_avatar_url
```

This creates:
- Migration file in `prisma/migrations/`
- Updates database schema
- Regenerates Prisma client

#### Step 3: Update TypeScript Code

**Service**:
```typescript
export const userService = {
  async updateUser(userId: string, data: any) {
    return await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        firstName: data.first_name,
        lastName: data.last_name,
        avatarUrl: data.avatar_url,  // New field
        updatedAt: new Date(),
      },
    });
  },
};
```

#### Step 4: Update Tests

```typescript
it('should update avatar URL', async () => {
  const response = await request(app)
    .put('/api/v2/users/current')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      user: {
        avatar_url: 'https://example.com/avatar.png',
      },
    });

  expect(response.status).toBe(200);
  expect(response.body.user.avatarUrl).toBe('https://example.com/avatar.png');
});
```

### 3. Adding a New Model

#### Step 1: Define Model in Prisma Schema

```prisma
model Notification {
  id          BigInt    @id @default(autoincrement())
  userId      BigInt    @map("user_id")
  title       String
  message     String
  read        Boolean   @default(false)
  readAt      DateTime? @map("read_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

model User {
  // ... existing fields ...
  notifications  Notification[]
}
```

#### Step 2: Generate Migration

```bash
npx prisma migrate dev --name add_notifications
```

#### Step 3: Create Full Stack

Follow steps from "Adding a New Endpoint":
1. Routes: `src/routes/notifications.ts`
2. Controller: `src/controllers/notificationsController.ts`
3. Service: `src/services/notificationService.ts`
4. Tests: `tests/integration/notifications.test.ts`

## Common Development Patterns

### BigInt Handling

**Always convert string IDs to BigInt**:

```typescript
// ✅ Correct
const user = await prisma.user.findUnique({
  where: { id: BigInt(userId) },
});

// ❌ Incorrect
const user = await prisma.user.findUnique({
  where: { id: userId },  // Type error
});
```

**BigInt in JSON**:
```typescript
// Prisma automatically serializes BigInt to string in JSON
// No manual conversion needed
```

### Decimal Handling

**Monetary amounts**:

```typescript
import { Decimal } from '@prisma/client/runtime';

// Create account with balance
await prisma.account.create({
  data: {
    balance: new Decimal('1234.56'),
  },
});

// Update balance
await prisma.account.update({
  where: { id: BigInt(accountId) },
  data: {
    balance: new Decimal(req.body.balance),
  },
});
```

### Date Handling

**Always use ISO 8601 format**:

```typescript
// ✅ Correct
const transactions = await prisma.transaction.findMany({
  where: {
    postedAt: {
      gte: new Date('2024-01-01T00:00:00Z'),
      lte: new Date('2024-12-31T23:59:59Z'),
    },
  },
});

// Response automatically formatted
// "createdAt": "2024-01-01T00:00:00.000Z"
```

### Error Handling Pattern

**Consistent error responses**:

```typescript
try {
  // Business logic
  const result = await service.doSomething();
  return res.json({ result });
} catch (error) {
  // Log error with context
  logger.error({ error, userId }, 'Operation failed');

  // Return generic error to client
  return res.status(500).json({
    error: 'Internal server error',
  });
}
```

### Logging Best Practices

**Structured logging**:

```typescript
// ✅ Good: Structured data
logger.info({ userId, accountId, amount }, 'Transaction created');

// ❌ Bad: String concatenation
logger.info(`Transaction created for user ${userId}`);
```

**Log levels**:
```typescript
logger.debug({ query }, 'Database query');      // Development only
logger.info({ userId }, 'User logged in');      // Important events
logger.warn({ error }, 'Non-critical error');   // Warnings
logger.error({ error, context }, 'Error');      // Errors requiring attention
logger.fatal({ error }, 'Critical failure');    // System-level failures
```

## Testing Strategies

### Unit Tests (Services)

```typescript
describe('userService', () => {
  it('should get user by id', async () => {
    const user = await userService.getUserById('123');
    expect(user).toBeDefined();
    expect(user?.id).toBe(BigInt(123));
  });
});
```

### Integration Tests (API)

```typescript
describe('GET /users/current', () => {
  it('should return current user', async () => {
    const response = await request(app)
      .get('/api/v2/users/current')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });
});
```

### Test Data Helpers

```typescript
// tests/helpers/testData.ts
export async function createTestUser(overrides = {}) {
  return await prisma.user.create({
    data: {
      partnerId: BigInt(1),
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    },
  });
}

export async function createTestAccount(userId: bigint, overrides = {}) {
  return await prisma.account.create({
    data: {
      userId,
      partnerId: BigInt(1),
      name: 'Test Account',
      accountType: 'checking',
      balance: new Decimal('1000.00'),
      state: 'active',
      ...overrides,
    },
  });
}

// Usage
const user = await createTestUser();
const account = await createTestAccount(user.id);
```

## Database Management

### Viewing Data

**Prisma Studio**:
```bash
npm run prisma:studio
```

**psql**:
```bash
docker-compose exec postgres psql -U pfm_user -d pfm_simulator

# Queries
SELECT * FROM users LIMIT 10;
SELECT * FROM accounts WHERE user_id = 123;
```

### Resetting Database

**Complete reset** (destroys all data):
```bash
npx prisma migrate reset
```

This will:
1. Drop database
2. Create database
3. Run all migrations
4. Run seed script (if configured)

### Creating Migrations

**After schema changes**:
```bash
npx prisma migrate dev --name description_of_change
```

Examples:
```bash
npx prisma migrate dev --name add_user_avatar
npx prisma migrate dev --name update_account_fields
npx prisma migrate dev --name create_notifications_table
```

### Migration Troubleshooting

**Migration failed**:
```bash
# Check migration status
npx prisma migrate status

# Resolve migration
npx prisma migrate resolve --applied migration_name

# Or reset if in development
npx prisma migrate reset
```

## Environment Configuration

### Development

**`.env`**:
```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DATABASE_URL=postgresql://pfm_user:pfm_password@localhost:5432/pfm_simulator
JWT_SECRET=dev-secret-change-in-production
ENABLE_CORS=true
CORS_ORIGINS=http://localhost:3001,http://localhost:8080
```

### Testing

**`.env.test`** (optional):
```env
NODE_ENV=test
DATABASE_URL=postgresql://pfm_user:pfm_password@localhost:5432/pfm_simulator_test
JWT_SECRET=test-secret
LOG_LEVEL=error
```

### Production

**Environment variables** (do not use .env file):
```bash
export NODE_ENV=production
export PORT=3000
export LOG_LEVEL=info
export DATABASE_URL=postgresql://...
export JWT_SECRET=<strong-random-secret>
export ENABLE_CORS=true
export CORS_ORIGINS=https://app.example.com
```

## Debugging

### VS Code Launch Configuration

**`.vscode/launch.json`**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Logging Database Queries

**Enable Prisma query logging**:

```typescript
// src/config/database.ts
export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  logger.debug({ query: e.query, duration: e.duration }, 'Database query');
});
```

### Request/Response Logging

Already enabled via `pino-http` middleware:

```typescript
// src/middleware/logging.ts
export const requestLogger = pinoHttp({
  logger,
  autoLogging: true,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
    if (res.statusCode >= 500) return 'error';
    return 'info';
  },
});
```

## Code Style & Conventions

### Naming Conventions

**Files**:
- `camelCase.ts` for TypeScript files
- `PascalCase.tsx` for React components (future)

**Variables/Functions**:
```typescript
const userId = '123';           // camelCase
const MAX_RETRIES = 3;          // UPPER_SNAKE_CASE for constants

function getUserById() {}       // camelCase
async function fetchData() {}   // camelCase
```

**Types/Interfaces**:
```typescript
interface UserData {}           // PascalCase
type AccountType = 'checking';  // PascalCase
enum AccountState {}            // PascalCase
```

**Database Fields** (Prisma):
```prisma
model User {
  firstName    String   @map("first_name")  // camelCase in Prisma, snake_case in DB
  createdAt    DateTime @map("created_at")
}
```

### Code Organization

**Import order**:
```typescript
// 1. Node built-ins
import path from 'path';

// 2. External dependencies
import express from 'express';
import { PrismaClient } from '@prisma/client';

// 3. Internal modules
import { logger } from '../config/logger';
import { accountService } from '../services/accountService';
```

**Export patterns**:
```typescript
// ✅ Named exports (preferred for services, utilities)
export const accountService = { /* ... */ };
export function helper() {}

// ✅ Default exports (for routes, middleware)
export default router;
```

### TypeScript Best Practices

**Avoid `any`**:
```typescript
// ❌ Bad
function process(data: any) {}

// ✅ Good
function process(data: unknown) {
  // Type guard
  if (typeof data === 'string') {
    // data is string
  }
}

// ✅ Better
interface ProcessData {
  id: string;
  name: string;
}
function process(data: ProcessData) {}
```

**Use Prisma types**:
```typescript
import { Account, Prisma } from '@prisma/client';

// ✅ Use generated types
function updateAccount(data: Prisma.AccountUpdateInput) {}

// ✅ Return Prisma types
async function getAccount(): Promise<Account | null> {}
```

## Performance Tips

### Database Queries

**Use select for specific fields**:
```typescript
// ❌ Fetches all fields
const users = await prisma.user.findMany();

// ✅ Fetches only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
  },
});
```

**Use pagination**:
```typescript
const transactions = await prisma.transaction.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { postedAt: 'desc' },
});
```

**Batch operations**:
```typescript
// ✅ Create many in one query
await prisma.transaction.createMany({
  data: transactions,
  skipDuplicates: true,
});

// ❌ Multiple individual inserts
for (const tx of transactions) {
  await prisma.transaction.create({ data: tx });
}
```

### API Response Time

**Target**: < 100ms for 95% of requests

**Optimization checklist**:
- [ ] Efficient database queries
- [ ] Proper indexing
- [ ] Select only needed fields
- [ ] Avoid N+1 queries
- [ ] Use connection pooling (automatic with Prisma)

## Troubleshooting

### Common Issues

**"Port 3000 already in use"**:
```bash
# Find process using port
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or change port in .env
PORT=3001
```

**"Cannot find module"**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**"Prisma Client not generated"**:
```bash
npm run prisma:generate
```

**"Migration failed"**:
```bash
# Check status
npx prisma migrate status

# Reset (development only)
npx prisma migrate reset
```

**"TypeScript compilation errors"**:
```bash
# Clean build
rm -rf dist/
npm run build
```

### Getting Help

1. Check logs in console
2. Review `docs/` directory
3. Check Prisma documentation
4. Review existing code patterns
5. Ask in team chat

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Review [API.md](./API.md) for endpoint details
- See [MIGRATION_TOOL.md](./MIGRATION_TOOL.md) for data import
- Check [CLAUDE.md](../CLAUDE.md) for development tips
