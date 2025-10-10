# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**pfm-backend-simulator** is a lightweight Node.js/TypeScript backend simulator for Personal Financial Management (PFM) development. It provides REST API endpoints compatible with the `responsive-tiles` frontend application, simulating the Geezeo PFM API v2 specification.

**Tech Stack**:
- Node.js 20+ with TypeScript
- Express.js web framework
- Prisma ORM with PostgreSQL
- JWT authentication
- Pino structured logging
- Jest for testing

**Purpose**: Development backend for `responsive-tiles` frontend (`/Users/LenMiller/code/banno/responsive-tiles`), providing API v2 endpoints without requiring the full Rails Geezeo backend.

## Common Development Commands

### Development Server
```bash
npm run dev              # Start development server with hot reload (nodemon + ts-node)
npm start                # Start production server (requires build first)
npm run build            # Compile TypeScript to dist/
npm run cli              # Interactive CLI to explore and test the API
```

### Database Operations
```bash
npm run prisma:generate  # Generate Prisma client from schema
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio GUI
npm run seed             # Seed database with test data
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Code Quality
```bash
npm run lint             # Run ESLint on src/
npm run format           # Format code with Prettier
```

### Caddy Reverse Proxy (HTTPS)
```bash
caddy run --config Caddyfile      # Start Caddy reverse proxy manually
caddy validate --config Caddyfile # Validate Caddyfile configuration
caddy stop                        # Stop Caddy
```

**Why Caddy?** Responsive-tiles expects HTTPS on port 443 (`https://pfm.backend.simulator.com`). Caddy provides automatic HTTPS with self-signed certificates, proxying to the HTTP backend on port 3000. This makes pfm-backend-simulator a true drop-in replacement for staging without modifying responsive-tiles.

**CLI Integration**: The Quick Start workflow automatically manages Caddy. See `docs/CADDY_INTEGRATION.md` for details.

## Architecture Overview

### Core Design Pattern: MVC + Service Layer

**Request Flow**:
```
Express Route → Auth Middleware → Controller → Service Layer → Prisma ORM → PostgreSQL
                                      ↓
                                  Serializer → JSON Response
```

### Directory Structure

```
src/
├── config/          # Configuration modules (database, logger, auth)
├── middleware/      # Express middleware (auth, logging, error handling)
├── routes/          # Express route definitions (map HTTP to controllers)
├── controllers/     # Request handlers (parse, validate, call services)
├── services/        # Business logic layer (database operations)
├── types/           # TypeScript type definitions
└── utils/           # Utilities (serializers for API responses)

tools/
├── seed/            # Database seeding utilities
└── migrate-ui/      # Web UI for data migration (not currently active)

tests/
├── unit/            # Unit tests
└── integration/     # Integration tests
```

### Key Architectural Concepts

**JWT Authentication**:
- Dual format support: Standard `{ userId, partnerId }` and responsive-tiles format `{ sub, iss }` where `sub=userId`, `iss=partnerId`
- Middleware: `authenticateJWT` (required) and `optionalAuth` (optional)
- Located in `src/middleware/auth.ts`

**Multi-Tenancy via Partners**:
- Every user belongs to a Partner (e.g., financial institution)
- Partner controls feature flags, branding, OAuth clients
- All data scoped by userId + partnerId for security

**Response Serialization**:
- Located in `src/utils/serializers.ts`
- Format responses to match Geezeo API v2 specification
- Transforms Prisma models to snake_case JSON with proper field mappings
- Critical for responsive-tiles frontend compatibility

**Database Schema** (Prisma):
- PostgreSQL with Prisma ORM
- Schema: `prisma/schema.prisma`
- Models: Partner, User, Account, Transaction, Budget, Goal, Alert, Notification, Tag, CashflowBill, CashflowIncome, CashflowEvent (14 total models)
- All timestamps: `createdAt`, `updatedAt`, soft deletes with `deletedAt`
- See schema for full field definitions and relationships

### Service Layer Pattern

Services encapsulate database operations and business logic:

```typescript
// Example: src/services/accountService.ts
export const getAccounts = async (userId: bigint, partnerId: bigint) => {
  return await prisma.account.findMany({
    where: { userId, partnerId, deletedAt: null },
    orderBy: [{ ordering: 'asc' }, { createdAt: 'desc' }]
  });
};
```

Controllers call services and handle HTTP concerns:

```typescript
// Example: src/controllers/accountsController.ts
export const listAccounts = async (req: Request, res: Response) => {
  const accounts = await getAccounts(req.context.userId, req.context.partnerId);
  res.json({ accounts: accounts.map(serializeAccount) });
};
```

## Testing Strategy

**Test Organization**:
- `tests/unit/` - Unit tests for services, utilities, helpers
- `tests/integration/` - API endpoint integration tests
- `tests/setup.ts` - Jest configuration and test utilities

**Running Specific Tests**:
```bash
npm test -- tests/integration/accounts.test.ts  # Single test file
npm test -- --testNamePattern="GET /accounts"   # Specific test case
```

**Test Database**:
- Integration tests should use a separate test database
- Consider using `DATABASE_URL_TEST` environment variable
- Clean up test data in `afterEach` or `afterAll` hooks

## Critical Implementation Notes

### Current Implementation Status (100% Database Implementation Complete ✅)

**Test Status**: 202/202 tests passing (100%) ✅

**Database Implementation**: All 11 service modules now use Prisma ORM with PostgreSQL - no mock data files. Recent migration (Oct 2024) completed transition from mock JSON files to full database persistence for Budget and Notification services.

**Fully Implemented**:
- ✅ Budgets CRUD (100%) - src/controllers/budgetsController.ts + src/services/budgetService.ts
  - Full Prisma database implementation with transaction aggregation
  - Budget spent calculation based on real transaction data
  - Budget state calculation (under/risk/over)
- ✅ Accounts CRUD with POST (100%) - src/controllers/accountsController.ts
- ✅ Transactions CRUD with POST (100%) - src/controllers/transactionsController.ts
- ✅ Cashflow Module (100%) - src/controllers/cashflowController.ts
  - Bills, Incomes, Events CRUD
  - 15 endpoints with recurrence logic
- ✅ Alerts & Notifications (100%) - src/controllers/alertsController.ts + src/services/notificationService.ts
  - Full Prisma database implementation with soft deletes
  - 6 alert types (account_threshold, goal, merchant_name, spending_target, transaction_limit, upcoming_bill)
  - 20+ endpoints with flexible JSON conditions
  - Alert evaluation logic and multi-channel delivery design
  - Notification tracking (read/unread, email/SMS delivery status)
- ✅ JWT authentication (dual format)
- ✅ Database schema (Prisma) - comprehensive models
- ✅ Partner management
- ✅ Goals CRUD - src/controllers/goalsController.ts
- ✅ Tags implementation - src/controllers/tagsController.ts
- ✅ Users basic operations - src/controllers/usersController.ts
- ✅ Expenses Module (100%) - src/controllers/expensesController.ts
  - 6 endpoints with period-based queries
  - Category/merchant/tag aggregation
  - Trends and comparison analytics
  - Performance optimized with database indexes

- ✅ Networth Module (100%) - src/controllers/networthController.ts + src/services/networthService.ts
  - Full Prisma database implementation with Decimal precision
  - Asset/liability categorization by account type
  - Summary endpoint (assets, liabilities, total networth)
  - Detailed breakdown endpoint (per-account contribution)
  - Historical networth calculation (current month only, ready for balance history feature)
  - Respects includeInNetworth flags and account state

**Not Implemented** (stubbed in `src/routes/stubs.ts`):
- ❌ Account aggregation endpoints (Plaid/Finicity/MX integration)
- ❌ Advanced analytics and reporting
- ❌ Batch import/export functionality

### When Implementing New Endpoints

1. **Check responsive-tiles requirements**: Reference `/Users/LenMiller/code/banno/responsive-tiles/src/api/` to understand expected request/response formats
2. **Check Geezeo reference implementation**: Reference `/Users/LenMiller/code/banno/geezeo` for authoritative API v2 behavior (Rails + RABL serializers)
3. **Prisma models already exist**: Database schema is comprehensive; most models are defined
4. **Follow existing patterns**:
   - Route → Controller → Service → Prisma
   - Use serializers in `src/utils/serializers.ts` for response formatting
   - Apply authentication middleware
   - Scope all queries by userId + partnerId
5. **Response format compatibility**: Must match Geezeo API v2 (snake_case, specific field names)
6. **Remove stubs**: Delete corresponding stub routes in `src/routes/stubs.ts` after implementation

### Serialization Requirements

All API responses must match the Geezeo API v2 format:
- Snake_case field names (e.g., `user_id`, `created_at`)
- Specific field mappings (e.g., Prisma `id` → JSON `id` as string for compatibility)
- Date formatting: ISO 8601 strings
- Decimal formatting: String representation for precision

**Example**:
```typescript
// Prisma model has: createdAt, userId, accountType
// Serialized JSON must have: created_at, user_id, account_type
```

See `src/utils/serializers.ts` for existing serializer implementations.

### Authentication Context

All protected routes receive `req.context` with:
```typescript
req.context = {
  userId: bigint,    // From JWT sub or userId claim
  partnerId: bigint  // From JWT iss or partnerId claim
}
```

Always use these values to scope database queries for security.

## Environment Configuration

Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing (min 32 chars)
- `NODE_ENV` - development | production
- `PORT` - Server port (default 3000)
- `LOG_LEVEL` - Logging level (debug | info | warn | error)
- `ENABLE_CORS` - true/false
- `CORS_ORIGINS` - Comma-separated allowed origins

## API Compatibility

**Base Path**: All routes under `/api/v2`

**Authentication**: Bearer JWT token in `Authorization` header

**Response Format**:
- Success: `{ resource: {...} }` or `{ resources: [...] }`
- Error: `{ error: "message", details?: {...} }`

**Compatible Frontend**: This backend is designed for `responsive-tiles` frontend located at `/Users/LenMiller/code/banno/responsive-tiles`

**Reference Implementation**: Geezeo Rails backend at `/Users/LenMiller/code/banno/geezeo` provides authoritative API v2 specification

## Migration and Seeding

### Database Seeding

The project includes a comprehensive seeding system to generate realistic test data using Faker.js.

**Basic Seeding** (clears existing data and generates defaults):
```bash
npm run seed -- generate --clear
```

**Seeding Options**:
```bash
# View all options
npm run seed -- generate --help

# Custom data amounts
npm run seed -- generate --clear --users 20 --accounts 5 --transactions 200

# Predefined scenarios
npm run seed -- generate --clear --scenario basic      # Default: 10 users, 3 accounts, 100 transactions
npm run seed -- generate --clear --scenario realistic  # More realistic data volumes
npm run seed -- generate --clear --scenario stress     # Large data set for testing

# Multiple partners
npm run seed -- generate --clear --partners 3 --users 5
```

**Available Options**:
- `-s, --scenario <name>` - Predefined scenario (basic, realistic, stress)
- `-p, --partners <count>` - Number of partners to generate (default: 1)
- `-u, --users <count>` - Number of users per partner (default: 10)
- `-a, --accounts <count>` - Number of accounts per user (default: 3)
- `-t, --transactions <count>` - Number of transactions per account (default: 100)
- `--clear` - Clear existing data before generating

**Generated Data**:
- Partners with OAuth clients and feature flags
- Users with bcrypt-hashed passwords (Password123!)
- Accounts (checking, savings, credit cards, etc.)
- Transactions with realistic merchants and categories
- Budgets with spending calculations
- Goals (payoff and savings)
- Alerts and notifications
- Cashflow items (bills, incomes)

**Test User Credentials**:
All generated users have the password: `Password123!`

User emails are randomly generated. To see actual emails, either:
- Check the CLI tool which lists available test users
- Run: `npm run seed -- generate --clear` and check the output
- Query the database directly with Prisma Studio: `npm run prisma:studio`

**Seeding Implementation**:
- Generators located in `tools/seed/generators/`
- Main entry point: `tools/seed/index.ts`
- Uses Commander.js for CLI interface
- Generates realistic data with @faker-js/faker

### Database Migrations

Use Prisma migrations for schema changes:
```bash
npx prisma migrate dev --name description_of_change
```

## Known Issues and Limitations

1. **Background Jobs Not Implemented**: Alert evaluation, cashflow projections run on-demand only (see specs/fodder/FUTURE_FEATURES.md for implementation plan)
2. **Email/SMS Integration Pending**: Notification delivery channels not yet connected to external providers
3. **Account Aggregation Missing**: No integration with Plaid/Finicity/MX for automatic transaction sync
4. **Balance History Tracking**: Historical networth requires balance snapshots (see specs/fodder/FUTURE_FEATURES.md)
5. **Limited Test Coverage**: Integration tests exist for budgets, cashflow, alerts; expand to all modules
6. **No Rate Limiting**: API has no request rate limits or throttling
7. **Single Database Instance**: No read replicas or sharding for horizontal scaling

## Interactive CLI Tool

**Learning the API**: The project includes an interactive CLI (`npm run cli`) to help you explore and learn the API:

**Features**:
- Interactive menu-driven interface
- Shows actual HTTP requests/responses for learning
- Test all major features (accounts, budgets, transactions, etc.)
- Pre-configured test users for quick authentication
- Educational mode with request logging

**Quick Start**:
```bash
npm run dev      # Start server in one terminal
npm run seed     # Seed test data (if not done)
npm run cli      # Start interactive CLI in another terminal
```

**Benefits**:
- Learn API endpoints hands-on
- See HTTP request/response details
- Test workflows without writing code
- Understand authentication and data flow
- Great for onboarding or exploring features

See `tools/cli/README.md` for detailed usage guide.

## Development Workflow

**Starting Development**:
1. Ensure PostgreSQL is running (or use Docker: `docker-compose up -d`)
2. Copy `.env.example` to `.env` and configure
3. Run `npm install`
4. Run `npm run prisma:migrate` to set up database
5. Run `npm run seed` to populate test data
6. Run `npm run dev` to start development server

**Making Changes**:
1. Modify code in `src/`
2. Server auto-restarts via nodemon
3. Run tests: `npm test`
4. Check linting: `npm run lint`
5. Format code: `npm run format`

**Before Committing**:
1. `npm run build` - Ensure TypeScript compiles
2. `npm test` - All tests pass
3. `npm run lint` - No linting errors
4. `npm run format` - Code formatted consistently
