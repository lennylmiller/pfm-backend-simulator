# Architecture Documentation

## Overview

PFM Backend Simulator is a lightweight, production-grade backend simulator built with Node.js, Express, TypeScript, and PostgreSQL. It implements the Geezeo PFM API v2 specification to support responsive-tiles frontend development.

## Design Principles

### 1. Layered Architecture

The application follows a clean 3-layer architecture pattern:

```
┌─────────────────────────────────────────────────────┐
│             HTTP Layer (Express)                     │
│  • Routes - URL definitions and mounting            │
│  • Middleware - Auth, logging, error handling       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│          Application Layer (Controllers)             │
│  • Request validation                               │
│  • Authorization checks                             │
│  • Response formatting                              │
│  • Error handling                                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Business Layer (Services)                  │
│  • Business logic                                   │
│  • Data validation                                  │
│  • Reusable operations                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│            Data Layer (Prisma ORM)                   │
│  • Database queries                                 │
│  • Transactions                                     │
│  • Schema management                                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              PostgreSQL Database                     │
└─────────────────────────────────────────────────────┘
```

**Key Benefits**:
- Clear separation of concerns
- Testable business logic
- Reusable service methods
- Maintainable codebase

### 2. Type Safety

- **TypeScript**: Strict mode enabled, full type safety
- **Prisma**: Generated types for all database models
- **Validation**: Zod schemas for runtime validation (future)
- **No Any**: Avoid `any` type, use proper typing

### 3. Dependency Injection

- **Configuration**: Centralized in `src/config/`
- **Database**: Singleton Prisma client
- **Logger**: Singleton Pino logger
- **Services**: Stateless, injectable modules

## Directory Structure

```
pfm-backend-simulator/
├── src/
│   ├── config/              # Configuration modules
│   │   ├── database.ts      # Prisma client singleton
│   │   ├── auth.ts          # JWT configuration
│   │   └── logger.ts        # Pino logger setup
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # JWT authentication
│   │   ├── logging.ts       # Request/response logging
│   │   └── errorHandler.ts # Global error handling
│   │
│   ├── routes/              # API route definitions
│   │   ├── index.ts         # Main router
│   │   ├── users.ts         # User routes
│   │   ├── partners.ts      # Partner routes
│   │   ├── accounts.ts      # Account routes
│   │   └── migrate.ts       # Migration tool routes
│   │
│   ├── controllers/         # Request handlers
│   │   ├── accountsController.ts
│   │   └── partnersController.ts
│   │
│   ├── services/            # Business logic
│   │   └── accountService.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   └── auth.ts          # Auth-related types
│   │
│   ├── utils/               # Utility functions
│   │
│   └── index.ts             # Application entry point
│
├── prisma/
│   ├── schema.prisma        # Database schema (source of truth)
│   └── migrations/          # Database migrations
│
├── tools/
│   ├── migrate/             # Migration tool backend
│   ├── migrate-ui/          # Migration tool web UI
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   └── seed/                # Test data generation
│       ├── index.ts         # CLI tool
│       └── generators/      # Domain generators
│
├── tests/
│   ├── integration/         # API integration tests
│   │   └── accounts.test.ts
│   └── setup.ts             # Test environment setup
│
├── docker-compose.yml       # Docker orchestration
├── Dockerfile               # Container image
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Core Components

### Application Entry Point

**File**: `src/index.ts`

Responsibilities:
1. Load environment variables
2. Configure Express middleware
3. Mount routes
4. Set up error handlers
5. Start HTTP server
6. Handle graceful shutdown

```typescript
// Simplified structure
import express from 'express';
import routes from './routes';
import { authenticateJWT } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/v2', routes);
app.use('/api/migrate', migrateRoutes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

### Route Organization

**Pattern**: Feature-based routing with Express Router

**Main Router** (`src/routes/index.ts`):
```typescript
router.use('/users', usersRoutes);
router.use('/partners', partnersRoutes);
```

**Nested Routes** (`src/routes/users.ts`):
```typescript
// Accounts are nested under users
router.use('/:userId/accounts', authenticateJWT, accountsRoutes);
```

**Resource Routes** (`src/routes/accounts.ts`):
```typescript
router.get('/all', getAllAccounts);
router.get('/:id', getAccount);
router.put('/:id', updateAccount);
```

**URL Structure**:
```
/api/v2/partners/current
/api/v2/users/{userId}/accounts/all
/api/v2/users/{userId}/accounts/{id}
```

### Controller Pattern

Controllers handle HTTP concerns only:

```typescript
export const getAllAccounts = async (req: Request, res: Response) => {
  try {
    // 1. Extract parameters
    const { userId } = req.params;

    // 2. Authorization check
    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 3. Call service
    const accounts = await accountService.getAllAccounts(userId);

    // 4. Return response
    return res.json({ accounts });
  } catch (error) {
    // 5. Error handling
    logger.error({ error }, 'Failed to get all accounts');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Responsibilities**:
- Parameter extraction
- Authorization validation
- Service invocation
- Response formatting
- Error handling

**Not Responsible For**:
- Business logic
- Database queries
- Data transformation

### Service Pattern

Services contain reusable business logic:

```typescript
export const accountService = {
  async getAllAccounts(userId: string) {
    return await prisma.account.findMany({
      where: {
        userId: BigInt(userId),
        archivedAt: null,
        state: AccountState.active,
      },
      orderBy: {
        ordering: 'asc',
      },
    });
  },

  async updateAccount(userId: string, accountId: string, data: any) {
    return await prisma.account.update({
      where: { id: BigInt(accountId) },
      data: {
        name: data.name,
        displayName: data.display_name,
        updatedAt: new Date(),
      },
    });
  },
};
```

**Responsibilities**:
- Business logic
- Data validation
- Database queries
- Data transformation

**Benefits**:
- Reusable across controllers
- Testable in isolation
- Clear business logic

## Authentication & Authorization

### JWT Flow

```
┌─────────┐                ┌──────────────┐                ┌──────────┐
│ Client  │                │  Middleware  │                │Controller│
└────┬────┘                └──────┬───────┘                └────┬─────┘
     │                            │                             │
     │ GET /users/123/accounts    │                             │
     │ Authorization: Bearer JWT  │                             │
     ├───────────────────────────>│                             │
     │                            │                             │
     │                            │ 1. Verify JWT               │
     │                            │ 2. Extract payload          │
     │                            │ 3. Attach to req.context    │
     │                            │                             │
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │  4. Validate userId matches │
     │                            │     req.context.userId      │
     │                            │                             │
     │                            │  5. Execute business logic  │
     │<───────────────────────────┴─────────────────────────────┤
     │         Response                                         │
```

### Middleware: `authenticateJWT`

```typescript
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, authConfig.jwtSecret) as JWTPayload;

    // Attach to request context
    req.context = {
      userId: payload.userId,
      partnerId: payload.partnerId,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

### Controller Authorization

```typescript
// Verify user can only access their own data
if (userId !== req.context?.userId) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

## Data Model Architecture

### Multi-Tenancy Hierarchy

```
Partner (Financial Institution)
  ├── Users (Customers)
  │   ├── Accounts (Bank Accounts)
  │   │   └── Transactions
  │   ├── Budgets
  │   ├── Goals (Savings/Payoff)
  │   ├── Alerts
  │   └── Notifications
  └── OAuth Clients
```

### Key Relationships

**One-to-Many**:
- Partner → Users
- Partner → Accounts
- User → Accounts
- User → Budgets, Goals, Alerts
- Account → Transactions

**Cascading Deletes**:
- Delete User → Cascade to Accounts, Transactions, Budgets, Goals, Alerts
- Delete Account → Cascade to Transactions

### BigInt ID Strategy

**Why BigInt**:
- Matches Geezeo API schema
- Supports large-scale data
- Future-proof ID space

**Implementation**:
```typescript
// Prisma schema
model Account {
  id BigInt @id @default(autoincrement())
}

// Service layer
const account = await prisma.account.findFirst({
  where: {
    id: BigInt(accountId),  // Convert string to BigInt
    userId: BigInt(userId),
  },
});

// JSON serialization (automatic)
// BigInt → String in JSON responses
```

### Soft Deletes & Archiving

**Soft Delete Pattern**:
```prisma
model Transaction {
  deletedAt DateTime? @map("deleted_at")
}
```

**Archive Pattern**:
```prisma
model Account {
  archivedAt DateTime? @map("archived_at")
}
```

**Query Patterns**:
```typescript
// Exclude soft-deleted records
where: {
  deletedAt: null,
}

// Exclude archived accounts
where: {
  archivedAt: null,
  state: AccountState.active,
}
```

## Database Layer (Prisma)

### Schema Philosophy

1. **Normalized Design**: Minimize data duplication
2. **Explicit Relations**: Define all foreign keys
3. **Enums**: Type-safe state management
4. **Indexes**: Optimize common queries
5. **JSON Fields**: Flexible metadata storage

### Migration Strategy

```bash
# 1. Edit schema.prisma
# 2. Generate migration
npx prisma migrate dev --name add_user_preferences

# 3. Regenerate Prisma client
npx prisma generate
```

### Connection Management

**Singleton Pattern**:
```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});
```

**Graceful Shutdown**:
```typescript
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

## Logging Architecture

### Structured Logging (Pino)

**Configuration** (`src/config/logger.ts`):
```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});
```

**HTTP Logging** (`src/middleware/logging.ts`):
```typescript
export const requestLogger = pinoHttp({
  logger,
  autoLogging: true,
});
```

**Usage**:
```typescript
logger.info({ userId }, 'User authenticated');
logger.error({ error, userId }, 'Failed to get accounts');
```

**Log Levels**:
- `trace`: Very detailed debugging
- `debug`: Debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error conditions
- `fatal`: Critical failures

## Error Handling

### Global Error Handler

```typescript
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({ err, url: req.url }, 'Unhandled error');

  res.status(500).json({
    error: 'Internal server error',
  });
};
```

### Controller Error Pattern

```typescript
try {
  // Business logic
} catch (error) {
  logger.error({ error }, 'Operation failed');
  return res.status(500).json({ error: 'Internal server error' });
}
```

### 404 Handler

```typescript
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
};
```

## Testing Architecture

### Integration Tests

**Setup** (`tests/setup.ts`):
```typescript
beforeAll(async () => {
  // Database setup
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

**Test Pattern** (`tests/integration/accounts.test.ts`):
```typescript
describe('GET /users/:userId/accounts/all', () => {
  it('should return all accounts for user', async () => {
    // 1. Create test data
    const user = await createTestUser();
    const accounts = await createTestAccounts(user.id, 3);

    // 2. Generate JWT
    const token = generateJWT(user.id);

    // 3. Make request
    const response = await request(app)
      .get(`/api/v2/users/${user.id}/accounts/all`)
      .set('Authorization', `Bearer ${token}`);

    // 4. Assert
    expect(response.status).toBe(200);
    expect(response.body.accounts).toHaveLength(3);

    // 5. Cleanup
    await cleanup();
  });
});
```

## Migration Tool Architecture

### Data Flow

```
┌──────────────┐    JWT Token    ┌──────────────┐
│  Web UI      │───────────────>│   Geezeo     │
│  (Browser)   │                 │   API        │
└──────┬───────┘                 └──────┬───────┘
       │                                │
       │ Config + Entities              │ JSON Data
       │                                │
       v                                v
┌──────────────────────────────────────────────┐
│        Migration API (/api/migrate)          │
│  1. Generate JWT from API key                │
│  2. Fetch from Geezeo endpoints              │
│  3. Transform data to Prisma schema          │
│  4. Insert via Prisma                        │
│  5. Stream progress via SSE                  │
└──────────────┬───────────────────────────────┘
               │
               v
┌──────────────────────────────────────────────┐
│         PostgreSQL Database                  │
└──────────────────────────────────────────────┘
```

### Components

1. **Web UI** (`tools/migrate-ui/`):
   - HTML form for credentials
   - JavaScript for API calls
   - Server-Sent Events client

2. **API Routes** (`src/routes/migrate.ts`):
   - `/test` - Test connection
   - `/start` - Begin migration (SSE)

3. **Data Transformation**:
   - Geezeo API format → Prisma schema format
   - BigInt conversion
   - Enum mapping

## Performance Considerations

### Database Optimizations

1. **Indexes**: Defined in Prisma schema
   ```prisma
   @@index([userId, partnerId])
   ```

2. **Connection Pooling**: Prisma automatic pooling

3. **Query Optimization**:
   ```typescript
   // Select only needed fields
   select: {
     id: true,
     name: true,
     balance: true,
   }
   ```

4. **Batch Operations**:
   ```typescript
   await prisma.account.createMany({
     data: accounts,
     skipDuplicates: true,
   });
   ```

### Response Time Targets

- 95th percentile: < 100ms
- 99th percentile: < 200ms
- Error rate: < 0.1%

## Security Considerations

### Environment Variables

- `JWT_SECRET`: Change in production (min 32 chars)
- `DATABASE_URL`: Use secrets management
- Never commit `.env` files

### CORS Configuration

```typescript
const origins = process.env.CORS_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: origins,
  credentials: true,
}));
```

### SQL Injection Prevention

- Prisma parameterizes all queries automatically
- No raw SQL needed for standard operations

### Authentication Best Practices

- JWT expiration enforced
- Token verification on every request
- User context validation in controllers

## Deployment Architecture

### Docker Compose (Development)

```yaml
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: pfm_simulator
      POSTGRES_USER: pfm_user
      POSTGRES_PASSWORD: pfm_password
    ports:
      - "5432:5432"

  api:
    build: .
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://pfm_user:pfm_password@postgres:5432/pfm_simulator
    ports:
      - "3000:3000"
```

### Production Deployment

1. **Build**:
   ```bash
   npm run build
   ```

2. **Run**:
   ```bash
   NODE_ENV=production node dist/index.js
   ```

3. **Environment**:
   - Set all required env variables
   - Use managed PostgreSQL
   - Enable HTTPS
   - Add rate limiting
   - Configure monitoring

## Scalability Patterns

### Horizontal Scaling

- Stateless application design
- Database connection pooling
- Load balancer ready
- Session-free architecture (JWT)

### Vertical Scaling

- PostgreSQL tuning
- Node.js cluster mode
- Memory optimization

### Caching Strategy (Future)

- Redis for session data
- Query result caching
- API response caching

## Monitoring & Observability

### Logging

- Structured JSON logs (production)
- Correlation IDs (future)
- Error tracking integration (future)

### Metrics (Future)

- Request rate
- Response time
- Error rate
- Database query time
- Connection pool usage

### Health Checks

```http
GET /health
```

Returns server status and timestamp.

## Future Enhancements

1. **Rate Limiting**: Prevent API abuse
2. **Pagination**: For large result sets
3. **WebSockets**: Real-time updates
4. **Caching**: Redis integration
5. **Monitoring**: Prometheus/Grafana
6. **API Versioning**: Support multiple versions
7. **GraphQL**: Alternative API interface
8. **Background Jobs**: Bull/BullMQ integration
