# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PFM Backend Simulator is a lightweight Node.js/Express backend that simulates the Geezeo PFM API (`/api/v2`) for responsive-tiles development. It provides 135+ API endpoints backed by PostgreSQL with Prisma ORM.

## Essential Commands

### Development
```bash
npm run dev              # Start dev server with hot reload (nodemon + ts-node)
npm run build            # Compile TypeScript to dist/
npm start                # Run built production code
```

### Database Operations
```bash
npm run prisma:generate  # Generate Prisma client (run after schema changes)
npm run prisma:migrate   # Create and run database migrations
npm run prisma:studio    # Open Prisma Studio GUI for database inspection
npx prisma migrate reset # Reset database (destroys all data)
```

### Data Management
```bash
# Test data generation with Faker.js
npm run seed -- generate --scenario realistic  # 100 users, 4 accounts each
npm run seed -- generate --scenario basic      # 5 users, 3 accounts each
npm run seed -- generate --scenario stress     # 5 partners, 1000 users each

# Custom generation
npm run seed -- generate --partners 2 --users 50 --accounts 4 --clear

# Web-based migration from Geezeo API
# 1. Start dev server: npm run dev
# 2. Navigate to: http://localhost:3000/migrate-ui
# 3. Enter API credentials and select data to import
```

### Testing
```bash
npm test                 # Run all Jest tests
npm test -- accounts.test.ts  # Run specific test file
npm run test:watch       # Run in watch mode (TDD)
npm run test:coverage    # Generate coverage report
```

### Code Quality
```bash
npm run lint             # ESLint on src/**/*.ts
npm run format           # Prettier on src/**/*.ts and tools/**/*.ts
```

## Architecture

### Layered Architecture Pattern

The codebase follows a clean 3-layer architecture:

```
Routes (HTTP) → Controllers (Request Handling) → Services (Business Logic) → Prisma (Data)
```

**Key Principle**: Services contain reusable business logic, controllers handle HTTP concerns (auth checks, response formatting, error handling). Keep controllers thin.

### Directory Structure

```
src/
├── config/           # Singleton configurations (database, auth, logger)
├── middleware/       # Express middleware (auth, logging, error handling)
├── routes/           # API route definitions (mount points)
├── controllers/      # Request handlers (HTTP layer)
├── services/         # Business logic (reusable, testable)
├── types/            # TypeScript type definitions
└── utils/            # Utility functions

prisma/
├── schema.prisma     # Database schema (source of truth)
└── migrations/       # Migration history (auto-generated)

tools/
├── migrate/          # Geezeo API → PostgreSQL migration tool
├── migrate-ui/       # Web UI for migration tool
└── seed/             # Test data generation with Faker.js
    └── generators/   # Domain-specific data generators

tests/
├── integration/      # API integration tests with supertest
└── setup.ts          # Test environment setup
```

### Authentication Flow

1. All `/api/v2` endpoints require JWT Bearer tokens
2. JWT payload contains `{ userId, partnerId }`
3. Middleware `authenticateJWT` verifies token and attaches `req.context`
4. Controllers validate `userId` from params matches `req.context.userId`

### Data Model Key Concepts

- **Multi-tenancy**: Partner → Users → Accounts → Transactions hierarchy
- **BigInt IDs**: All primary keys use PostgreSQL `bigint` (handle as `BigInt` in code)
- **Soft Deletes**: Use `deletedAt` timestamps, not hard deletes
- **Archiving**: Accounts use `archivedAt` for user-initiated archival
- **Account States**: `active | inactive | archived | pending | error`

### Prisma Patterns

**BigInt Handling**:
```typescript
// Always convert string params to BigInt for Prisma queries
const account = await prisma.account.findFirst({
  where: {
    id: BigInt(accountId),     // Convert string to BigInt
    userId: BigInt(userId),
  },
});
```

**Cascading Deletes**: Configured in schema via `onDelete: Cascade`
- Deleting a User cascades to Accounts, Transactions, Budgets, Goals, Alerts
- Deleting an Account cascades to Transactions

**Relations**: Always defined in schema, loaded via Prisma's relation queries

## Migration Tool Architecture

The migration tool (`/api/migrate` and `/migrate-ui`) imports real data from Geezeo production/staging:

1. **Web UI** (`tools/migrate-ui/`): HTML/JS form for credentials
2. **API Routes** (`src/routes/migrate.ts`): Express endpoints for migration
3. **Data Flow**:
   - Generate JWT using API key (same as responsive-tiles)
   - Fetch from Geezeo API endpoints (e.g., `/api/v2/users/{userId}/accounts/all`)
   - Transform API responses to Prisma schema format
   - Insert into local PostgreSQL via Prisma
   - Stream progress updates to UI

**Key Endpoints Migrated**:
- `/users/current` → User info
- `/users/{userId}/accounts/all` → Accounts
- `/users/{userId}/transactions/search` → Transactions
- `/users/{userId}/budgets`, `goals`, `alerts`, `tags`

## Testing Patterns

### Integration Tests
- Located in `tests/integration/`
- Use supertest for HTTP assertions
- Setup/teardown in `tests/setup.ts`
- Pattern: Create test data → Make request → Assert response → Cleanup

### Running Single Tests
```bash
# File-level
npm test -- accounts.test.ts

# Test-level (using -t flag)
npm test -- -t "should return all accounts"
```

## Common Development Patterns

### Adding a New Endpoint

1. **Define route** in `src/routes/{domain}.ts`:
   ```typescript
   router.get('/:userId/accounts/all', authenticateJWT, getAllAccounts);
   ```

2. **Create controller** in `src/controllers/{domain}Controller.ts`:
   ```typescript
   export const getAllAccounts = async (req: Request, res: Response) => {
     // 1. Extract params
     // 2. Validate user context
     // 3. Call service
     // 4. Return response
   };
   ```

3. **Implement service** in `src/services/{domain}Service.ts`:
   ```typescript
   export const accountService = {
     async getAllAccounts(userId: string) {
       return await prisma.account.findMany({
         where: { userId: BigInt(userId) },
       });
     },
   };
   ```

### Schema Changes

1. Edit `prisma/schema.prisma`
2. Generate migration: `npx prisma migrate dev --name description`
3. Regenerate client: `npm run prisma:generate`
4. Update TypeScript types and services

### Adding Test Data Generators

Generators in `tools/seed/generators/` follow this pattern:
- Use `@faker-js/faker` for realistic data
- Export async function accepting count and relations
- Return created records for use in related generators

## Environment Configuration

Required `.env` variables (copy from `.env.example`):

```env
DATABASE_URL="postgresql://pfm_user:pfm_password@localhost:5432/pfm_simulator"
JWT_SECRET="change-in-production-minimum-32-chars"
NODE_ENV="development"
PORT=3000
LOG_LEVEL="debug"
ENABLE_CORS=true
CORS_ORIGINS="http://localhost:3001,http://localhost:8080"
```

## Database Schema Philosophy

- **Normalized design**: Minimize data duplication
- **Indexed queries**: Indexes on `userId`, `partnerId`, foreign keys
- **Timezone handling**: Store UTC, convert in application layer
- **JSON fields**: Use for flexible data (`metadata`, `settings`, `featureFlags`)
- **Enums**: Define valid states in schema (`AccountType`, `AccountState`, etc.)

## Logging

Uses `pino` for structured JSON logging:
- **Development**: Pretty-printed with `pino-pretty`
- **Production**: JSON format for log aggregation
- **HTTP logging**: `pino-http` middleware logs all requests
- **Log levels**: `trace`, `debug`, `info`, `warn`, `error`, `fatal`

## Type Safety

- **Strict TypeScript**: All compiler strict flags enabled
- **Prisma types**: Generated types for models and enums
- **Custom types**: In `src/types/` for request context, auth payloads
- **No `any`**: Avoid `any`, use `unknown` or proper typing

## Performance Considerations

- **Connection pooling**: Prisma handles connection pooling automatically
- **Query optimization**: Use `select` to fetch only needed fields
- **Indexes**: Define in Prisma schema via `@@index`
- **BigInt serialization**: Handle JSON serialization of BigInt values
- **Response times**: Target <100ms for 95% of requests

## Docker Usage

```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Start full stack (database + API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down
```
