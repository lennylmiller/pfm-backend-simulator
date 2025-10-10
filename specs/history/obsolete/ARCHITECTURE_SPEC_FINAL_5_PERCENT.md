# Architecture Specification: Final 5% Implementation

**Document Type**: Technical Architecture Specification
**Version**: 1.0
**Date**: 2025-10-04
**Status**: Ready for Implementation
**Scope**: Infrastructure, Quality, and Optional Enhancements

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Phase 1: Code Cleanup & Quality](#3-phase-1-code-cleanup--quality)
4. [Phase 2: Infrastructure Layer](#4-phase-2-infrastructure-layer)
5. [Phase 3: Optional Enhancements](#5-phase-3-optional-enhancements)
6. [Integration Patterns](#6-integration-patterns)
7. [Testing Architecture](#7-testing-architecture)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Security Considerations](#9-security-considerations)
10. [Appendices](#10-appendices)

---

## 1. Overview

### 1.1 Purpose

This specification defines the architectural design for completing the final 5% of the PFM Backend Simulator, transforming it from 95% core feature completion to 100% production-ready status.

### 1.2 Goals

**Primary Goals**:
- Remove technical debt and dead code
- Implement production-ready infrastructure middleware
- Achieve 100% test suite stability
- Ensure API specification compliance

**Secondary Goals**:
- Add enhanced security features (JWT blacklist)
- Implement marketing capabilities (ads system)
- Prepare for future integrations (account aggregation)

### 1.3 Non-Goals

- Implementing background job processing system
- Email/SMS notification delivery infrastructure
- Third-party account aggregation (Plaid/MX/Finicity)
- Advanced analytics and reporting features

### 1.4 Architectural Principles

1. **Layered Architecture**: Maintain clean separation between middleware, routing, controllers, services, and data access
2. **Middleware Chain**: Request → CORS → Rate Limit → Auth → Pagination → Logging → Controller
3. **Stateless Design**: All state in PostgreSQL/Redis, no application memory dependencies
4. **API Compatibility**: Strict adherence to Geezeo API v2 specification
5. **Backward Compatibility**: New features must not break existing endpoints

---

## 2. System Architecture

### 2.1 Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│                  (responsive-tiles frontend)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS/JSON
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express.js Server                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Middleware Stack (Current)                                │  │
│  │  1. CORS ✅                                               │  │
│  │  2. Body Parser ✅                                        │  │
│  │  3. Cache Control ✅                                      │  │
│  │  4. Request Logging ✅                                    │  │
│  │  5. Authentication ✅ (JWT)                               │  │
│  │  6. Error Handler ✅                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Route Layer                                               │  │
│  │  /api/v2/users → usersRoutes                             │  │
│  │  /api/v2/partners → partnersRoutes                        │  │
│  │  (10 route modules)                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Controller Layer                                          │  │
│  │  Request validation, Context extraction                   │  │
│  │  Service orchestration, Response serialization            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Service Layer                                             │  │
│  │  Business logic, Data aggregation                         │  │
│  │  Transaction management                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Prisma ORM
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│  • Multi-tenant (Partner isolation)                              │
│  • BigInt IDs, Decimal currency                                  │
│  • Soft deletes (deletedAt)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Target Architecture (After Phase 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express.js Server                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Enhanced Middleware Stack                                 │  │
│  │  1. CORS ✅                                               │  │
│  │  2. Body Parser ✅                                        │  │
│  │  3. Cache Control ✅                                      │  │
│  │  4. Rate Limiting 🆕 (Partner + User levels)             │  │
│  │  5. Request Logging ✅                                    │  │
│  │  6. Authentication ✅ (JWT + Blacklist 🆕)               │  │
│  │  7. Pagination Helper 🆕                                  │  │
│  │  8. Error Handler ✅                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Route Layer (Cleaned)                                     │  │
│  │  • Dead stubs removed ✅                                  │  │
│  │  • All routes properly wired                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                  │
            ▼                                  ▼
┌──────────────────────┐          ┌──────────────────────┐
│   PostgreSQL DB      │          │    Redis Cache       │
│   (Primary Store)    │          │  🆕 New Dependency   │
│                      │          │  • Rate limits       │
│  • User data         │          │  • JWT blacklist     │
│  • Transactions      │          │  • Session data      │
│  • Accounts          │          └──────────────────────┘
└──────────────────────┘
```

### 2.3 Middleware Execution Flow

**Current Flow**:
```
Request
  ↓
CORS Handler
  ↓
Body Parser (JSON/URL)
  ↓
Cache Control Headers
  ↓
Request Logger
  ↓
Route Dispatcher
  ↓
Authentication Middleware (if protected)
  ↓
Controller Handler
  ↓
Response Serializer
  ↓
Error Handler (if error)
  ↓
Response
```

**Target Flow (Phase 2)**:
```
Request
  ↓
CORS Handler
  ↓
Body Parser (JSON/URL)
  ↓
Cache Control Headers
  ↓
🆕 Partner Rate Limiter (1000/hour)
  ↓
Request Logger
  ↓
Route Dispatcher
  ↓
Authentication Middleware
  ├─→ JWT Verification
  └─→ 🆕 Blacklist Check (if Phase 3)
  ↓
🆕 User Rate Limiter (100/15min)
  ↓
🆕 Pagination Parser (for list endpoints)
  ↓
Controller Handler
  ↓
Response Serializer (with pagination meta)
  ↓
Error Handler (if error)
  ↓
Response (with rate limit headers)
```

---

## 3. Phase 1: Code Cleanup & Quality

### 3.1 Dead Code Removal

#### 3.1.1 Problem Statement

**Issue**: Duplicate route registrations causing maintenance confusion

**Current State**:
```typescript
// src/routes/stubs.ts (Lines 17-27)
router.get('/users/:userId/transactions/search', ...) // DUPLICATE
router.get('/users/:userId/budgets', ...)             // DUPLICATE

// Real implementations:
// src/routes/transactions.ts:11
router.get('/search', authenticateJWT, transactionsController.searchTransactions);

// src/routes/budgets.ts (full CRUD)
// src/routes/users.ts:54 (mounted at /users/:userId/budgets)
```

**Risk**: Express uses first-match routing, so stubs are never reached, but create confusion for developers.

#### 3.1.2 Solution Design

**File**: `src/routes/stubs.ts`

```typescript
/**
 * Stub endpoints for features not yet implemented
 * These return empty data structures to prevent 404 errors
 * and allow the frontend to load successfully
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// ✅ REMOVED: Cashflow endpoints (implemented in cashflow.ts)
// ✅ REMOVED: Expenses endpoints (implemented in expenses.ts)
// ✅ REMOVED: Networth endpoints (implemented in users.ts)
// ✅ REMOVED: Transaction search (implemented in transactions.ts)
// ✅ REMOVED: Budgets (implemented in budgets.ts)

// Ads endpoint (not yet implemented - low priority)
router.get('/users/:userId/ads', authenticateJWT, (req: Request, res: Response) => {
  res.json({ ads: [] });
});

// Logout endpoint (implementation pending Phase 3)
router.post('/users/:userId/logout', authenticateJWT, (req: Request, res: Response) => {
  res.status(204).send();
});

// Harvest POST endpoint (external integration - future feature)
router.post('/users/:userId/harvest', authenticateJWT, (req: Request, res: Response) => {
  res.status(204).send();
});

export default router;
```

**Changes**:
- Remove lines 17-22 (transactions/search)
- Remove lines 24-27 (budgets)
- Add comments documenting where real implementations live
- Keep only genuinely unimplemented endpoints

**Validation Steps**:
```bash
# 1. Start server
npm run dev

# 2. Test transaction search (should hit real implementation)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v2/users/1/transactions/search?q=test"
# Expected: Real search results, not empty array

# 3. Test budgets (should hit real implementation)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v2/users/1/budgets"
# Expected: Real budget data, not empty array

# 4. Test ads (should hit stub)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v2/users/1/ads"
# Expected: { "ads": [] }
```

### 3.2 Test Suite Stabilization

#### 3.2.1 Problem Analysis

**Current Failures**: 8 test suites failing with pattern:
```
Jest did not exit one second after the test run has completed.
This usually means that there are asynchronous operations that weren't stopped.
```

**Root Causes**:
1. Database connections not properly closed
2. Test data not cleaned up between tests
3. Async operations in controllers not fully awaited
4. Shared test database causing conflicts

#### 3.2.2 Solution Architecture

**Component 1: Global Test Setup**

**File**: `tests/setup.ts`

```typescript
import { prisma } from '../src/config/database';
import { logger } from '../src/config/logger';

// Suppress logs during testing
logger.level = 'silent';

// Global setup (runs once before all tests)
beforeAll(async () => {
  // Ensure test database is clean
  await cleanDatabase();
});

// Global teardown (runs once after all tests)
afterAll(async () => {
  // Final cleanup
  await cleanDatabase();

  // Disconnect Prisma client
  await prisma.$disconnect();

  // Allow async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Helper function to clean database
async function cleanDatabase() {
  const tablenames = [
    'Transaction',
    'Account',
    'Budget',
    'Goal',
    'Tag',
    'Alert',
    'Notification',
    'CashflowBill',
    'CashflowIncome',
    'CashflowEvent',
    'User',
    'Partner'
  ];

  for (const tablename of tablenames) {
    try {
      await prisma[tablename.charAt(0).toLowerCase() + tablename.slice(1)].deleteMany({});
    } catch (error) {
      // Table might not exist or might be empty
      console.warn(`Could not clean ${tablename}:`, error.message);
    }
  }
}
```

**Component 2: Per-Suite Cleanup**

**Pattern for all test files**:

```typescript
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import request from 'supertest';
import jwt from 'jsonwebtoken';

describe('Module API', () => {
  let testPartnerId: bigint;
  let testUserId: bigint;
  let authToken: string;

  // Setup before all tests in this suite
  beforeAll(async () => {
    // Create test partner
    const partner = await prisma.partner.create({
      data: { name: 'Test Partner' }
    });
    testPartnerId = partner.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        partnerId: testPartnerId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }
    });
    testUserId = user.id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUserId.toString(), partnerId: testPartnerId.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
  });

  // Cleanup after each test
  afterEach(async () => {
    // Clean up test data created during tests
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.account.deleteMany({ where: { userId: testUserId } });
    // Add other cleanup as needed
  });

  // Cleanup after all tests in this suite
  afterAll(async () => {
    // Delete test user and partner
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.partner.delete({ where: { id: testPartnerId } }).catch(() => {});
  });

  // Tests...
});
```

**Component 3: Test Execution Strategy**

**Update**: `package.json`

```json
{
  "scripts": {
    "test": "NODE_ENV=test jest --runInBand --detectOpenHandles",
    "test:watch": "NODE_ENV=test jest --watch --runInBand",
    "test:coverage": "NODE_ENV=test jest --coverage --runInBand"
  }
}
```

**Flags**:
- `--runInBand`: Run tests serially to avoid database conflicts
- `--detectOpenHandles`: Help identify async issues
- `NODE_ENV=test`: Use test environment configuration

#### 3.2.3 Success Criteria

```bash
# All tests should pass
npm test

# Expected output:
# Test Suites: 9 passed, 9 total
# Tests:       202 passed, 202 total
# Snapshots:   0 total
# Time:        ~10s (serial execution)
```

---

## 4. Phase 2: Infrastructure Layer

### 4.1 Rate Limiting Architecture

#### 4.1.1 Requirements

**API Specification** (§1.2):
- 100 requests per 15 minutes per user
- 1000 requests per hour per partner
- Rate limit headers in all responses
- 429 status when exceeded

**Non-Functional Requirements**:
- Distributed rate limiting (works across multiple server instances)
- Graceful degradation (fallback to in-memory if Redis unavailable)
- Per-endpoint rate limit customization
- Minimal performance overhead (<5ms per request)

#### 4.1.2 Component Design

**Architecture**:
```
Request
  ↓
Partner Rate Limiter (1000/hour)
  ├─→ Redis Store (production)
  │   • Key: rl:partner:{partnerId}
  │   • Window: 1 hour sliding
  │
  ├─→ Memory Store (development)
  │   • In-process Map
  │   • Resets on server restart
  │
  └─→ Rate Limit Headers
      • X-RateLimit-Limit: 1000
      • X-RateLimit-Remaining: 995
      • X-RateLimit-Reset: 1696435200
  ↓
User Rate Limiter (100/15min)
  ├─→ Redis Store (production)
  │   • Key: rl:user:{userId}
  │   • Window: 15 minutes sliding
  │
  └─→ Rate Limit Headers
      • X-RateLimit-Limit: 100
      • X-RateLimit-Remaining: 95
      • X-RateLimit-Reset: 1696435200
  ↓
Controller
```

**File Structure**:
```
src/
├── middleware/
│   ├── rateLimit.ts          🆕 Rate limiting middleware
│   └── auth.ts                ✅ Existing (provides context)
├── config/
│   └── redis.ts              🆕 Redis client configuration
```

#### 4.1.3 Implementation Specification

**File**: `src/config/redis.ts` (NEW)

```typescript
import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client for rate limiting and caching
 * Gracefully handles connection failures for development
 */
export const getRedisClient = async (): Promise<RedisClientType | null> => {
  // Return existing client if already connected
  if (redisClient?.isOpen) {
    return redisClient;
  }

  // Skip Redis in test environment
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  // Only use Redis if URL is configured
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not configured, rate limiting will use in-memory store');
    return null;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.error('Redis connection failed after 3 retries');
            return new Error('Redis unavailable');
          }
          return retries * 1000; // Exponential backoff
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn({ error }, 'Failed to connect to Redis, using in-memory store');
    return null;
  }
};

/**
 * Disconnect Redis client on shutdown
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    logger.info('Redis client disconnected');
  }
};
```

**File**: `src/middleware/rateLimit.ts` (NEW)

```typescript
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
}

/**
 * Create a rate limiter with optional Redis backing
 * Falls back to in-memory store if Redis unavailable
 */
async function createRateLimiter(options: RateLimitOptions): Promise<RateLimitRequestHandler> {
  const redisClient = await getRedisClient();

  const limiterConfig = {
    windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: options.max || 100,
    message: {
      error: 'Rate limit exceeded',
      retry_after: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true, // Return RateLimit-* headers
    legacyHeaders: false,  // Disable X-RateLimit-* headers (use standard)
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    skip: options.skip,
    // Use Redis store if available
    ...(redisClient ? {
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:',
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      })
    } : {}),
    handler: (req, res) => {
      logger.warn({
        ip: req.ip,
        userId: req.context?.userId,
        partnerId: req.context?.partnerId,
        path: req.path
      }, 'Rate limit exceeded');

      res.status(429).json({
        error: 'Rate limit exceeded',
        retry_after: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
      });
    }
  };

  return rateLimit(limiterConfig);
}

/**
 * Partner-level rate limiting: 1000 requests per hour
 * Applied before authentication to prevent abuse
 */
export const createPartnerRateLimiter = async (): Promise<RateLimitRequestHandler> => {
  return createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000,
    keyGenerator: (req) => {
      // Use partnerId from JWT if available (after auth)
      // Otherwise use IP address (before auth)
      return req.context?.partnerId || req.ip || 'anonymous';
    }
  });
};

/**
 * User-level rate limiting: 100 requests per 15 minutes
 * Applied after authentication to limit per-user requests
 */
export const createUserRateLimiter = async (): Promise<RateLimitRequestHandler> => {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    keyGenerator: (req) => {
      // Use userId from JWT context
      // Fall back to IP if not authenticated (shouldn't happen for protected routes)
      return req.context?.userId || req.ip || 'anonymous';
    },
    // Skip rate limiting for health checks
    skip: (req) => req.path === '/health'
  });
};
```

**Integration**: `src/index.ts`

```typescript
import { createPartnerRateLimiter, createUserRateLimiter } from './middleware/rateLimit';
import { disconnectRedis } from './config/redis';

// ... existing imports ...

const app = express();

// ... existing middleware (CORS, body parser, cache control) ...

// Rate limiting - Partner level (before auth)
const partnerRateLimiter = await createPartnerRateLimiter();
app.use('/api/v2', partnerRateLimiter);

// ... request logging ...

// API routes (includes auth middleware)
app.use('/api/v2', routes);

// Rate limiting - User level (after auth, applied to protected routes)
const userRateLimiter = await createUserRateLimiter();
app.use('/api/v2/users', userRateLimiter);

// ... rest of setup ...

// Graceful shutdown - disconnect Redis
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  await disconnectRedis(); // 🆕 New
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  await disconnectRedis(); // 🆕 New
  process.exit(0);
});
```

**Dependencies**:
```json
{
  "dependencies": {
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    "redis": "^4.6.12"
  }
}
```

#### 4.1.4 Testing Strategy

**Unit Tests**: `tests/unit/rateLimit.test.ts`

```typescript
import { createPartnerRateLimiter, createUserRateLimiter } from '../../src/middleware/rateLimit';
import express from 'express';
import request from 'supertest';

describe('Rate Limiting', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    const partnerLimiter = await createPartnerRateLimiter();
    const userLimiter = await createUserRateLimiter();

    app.use(partnerLimiter);

    app.get('/test', (req, res) => {
      res.json({ success: true });
    });

    app.get('/users/:userId/test', (req, res) => {
      // Simulate authenticated request
      req.context = { userId: '1', partnerId: '1' };
      res.json({ success: true });
    });

    app.use('/users', userLimiter);
  });

  describe('Partner Rate Limiter', () => {
    it('should allow requests under limit', async () => {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBe('1000');
      expect(res.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should block requests over limit', async () => {
      // Make 1001 requests
      for (let i = 0; i < 1001; i++) {
        const res = await request(app).get('/test');
        if (i < 1000) {
          expect(res.status).toBe(200);
        } else {
          expect(res.status).toBe(429);
          expect(res.body.error).toBe('Rate limit exceeded');
          expect(res.body.retry_after).toBe(3600); // 1 hour
        }
      }
    });
  });

  describe('User Rate Limiter', () => {
    it('should allow requests under limit', async () => {
      const res = await request(app).get('/users/1/test');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBe('100');
    });
  });
});
```

### 4.2 Pagination Architecture

#### 4.2.1 Requirements

**API Specification** (§1.3):
```json
{
  "resources": [...],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total_pages": 4,
    "total_count": 95
  }
}
```

**Query Parameters**:
- `page`: Page number (1-indexed, default: 1)
- `per_page`: Items per page (default: 25, max: 100)

**Non-Functional Requirements**:
- Backward compatible (optional pagination)
- Efficient database queries (limit/offset)
- Type-safe TypeScript implementation
- Reusable across all list endpoints

#### 4.2.2 Component Design

**File**: `src/middleware/pagination.ts` (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Pagination parameters extracted from request
 */
export interface PaginationParams {
  page: number;      // Current page (1-indexed)
  perPage: number;   // Items per page
  offset: number;    // Database offset (0-indexed)
  limit: number;     // Database limit (alias for perPage)
}

/**
 * Pagination metadata for responses
 */
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total_pages: number;
  total_count: number;
}

/**
 * Middleware to parse pagination query parameters
 * Adds `req.pagination` object for use in controllers
 */
export const paginationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Parse page (1-indexed, min 1)
  const page = Math.max(1, parseInt(req.query.page as string) || 1);

  // Parse per_page (min 1, max 100, default 25)
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(req.query.per_page as string) || 25)
  );

  // Calculate database offset (0-indexed)
  const offset = (page - 1) * perPage;

  // Attach to request
  req.pagination = {
    page,
    perPage,
    offset,
    limit: perPage
  };

  next();
};

/**
 * Create pagination metadata from total count
 */
export const createPaginationMeta = (
  totalCount: number,
  pagination: PaginationParams
): PaginationMeta => ({
  current_page: pagination.page,
  per_page: pagination.perPage,
  total_pages: Math.ceil(totalCount / pagination.perPage) || 1,
  total_count: totalCount
});

/**
 * Helper to create paginated response structure
 */
export const paginatedResponse = <T>(
  data: T[],
  totalCount: number,
  pagination: PaginationParams,
  resourceKey: string = 'resources'
): { [key: string]: T[] | PaginationMeta } => ({
  [resourceKey]: data,
  meta: createPaginationMeta(totalCount, pagination)
});
```

**Type Definitions**: `src/types/express.d.ts` (extend)

```typescript
import { PaginationParams } from '../middleware/pagination';

declare global {
  namespace Express {
    interface Request {
      context?: {
        userId: string;
        partnerId: string;
      };
      pagination?: PaginationParams; // 🆕 New
    }
  }
}

export {};
```

#### 4.2.3 Integration Pattern

**Example**: Update transactions search

**Service Layer**: `src/services/transactionService.ts`

```typescript
// Add count function
export const countTransactions = async (
  userId: bigint,
  filters: SearchFilters
): Promise<number> => {
  return await prisma.transaction.count({
    where: buildTransactionWhereClause(userId, filters)
  });
};

// Update search to accept limit/offset
export const searchTransactions = async (
  userId: bigint,
  filters: SearchFilters & { limit?: number; offset?: number }
): Promise<Transaction[]> => {
  return await prisma.transaction.findMany({
    where: buildTransactionWhereClause(userId, filters),
    orderBy: { postedAt: 'desc' },
    take: filters.limit || 25,
    skip: filters.offset || 0
  });
};
```

**Controller**: `src/controllers/transactionsController.ts`

```typescript
import { paginatedResponse } from '../middleware/pagination';
import { serialize } from '../utils/serializers';

export const searchTransactions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { q, untagged, tags, begin_on, end_on } = req.query;
    const pagination = req.pagination!; // Available after middleware

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(req.context!.userId);

    const filters = {
      query: q as string,
      untagged: untagged === '1' || untagged === 'true',
      tags: Array.isArray(tags) ? tags as string[] : tags ? [tags as string] : undefined,
      beginOn: begin_on as string,
      endOn: end_on as string,
      limit: pagination.limit,
      offset: pagination.offset
    };

    // Parallel queries for data + count
    const [transactions, totalCount] = await Promise.all([
      transactionService.searchTransactions(userIdBigInt, filters),
      transactionService.countTransactions(userIdBigInt, filters)
    ]);

    // Return paginated response
    return res.json(
      paginatedResponse(
        transactions.map(serialize),
        totalCount,
        pagination,
        'transactions' // Resource key
      )
    );
  } catch (error) {
    logger.error({ error }, 'Failed to search transactions');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Route**: `src/routes/transactions.ts`

```typescript
import { paginationMiddleware } from '../middleware/pagination';

// Apply pagination middleware to search endpoint
router.get(
  '/search',
  authenticateJWT,
  paginationMiddleware, // 🆕 New
  transactionsController.searchTransactions
);
```

#### 4.2.4 Rollout Strategy

**Phase 2A**: Implement on high-traffic endpoints first
1. `GET /users/:userId/transactions/search`
2. `GET /users/:userId/accounts/all`
3. `GET /users/:userId/budgets`

**Phase 2B**: Extend to remaining list endpoints
4. `GET /users/:userId/goals/savings_goals`
5. `GET /users/:userId/goals/payoff_goals`
6. `GET /users/:userId/tags`
7. `GET /users/:userId/alerts`
8. `GET /users/:userId/cashflow/bills`
9. `GET /users/:userId/cashflow/incomes`
10. `GET /users/:userId/cashflow/events`

**Backward Compatibility**:
- Pagination is optional (defaults to page=1, per_page=25)
- Existing clients without pagination params continue to work
- Meta object is always included in response

---

## 5. Phase 3: Optional Enhancements

### 5.1 JWT Logout Blacklist

#### 5.1.1 Requirements

**Use Case**: Invalidate JWT tokens on user logout for enhanced security

**Current Behavior**:
- JWT tokens remain valid until expiration (24 hours)
- Logout only clears client-side token storage
- No server-side token revocation

**Target Behavior**:
- Logout invalidates token server-side
- Subsequent requests with blacklisted token return 401
- Tokens automatically removed from blacklist after expiration

#### 5.1.2 Architecture

```
Login
  ↓
Generate JWT (exp: 24h)
  ↓
Client stores token
  ↓
[User makes requests]
  ↓
Logout Request
  ↓
POST /users/:userId/logout
  ├─→ Extract token from Authorization header
  ├─→ Add to Redis blacklist
  │   • Key: blacklist:{token}
  │   • TTL: remaining token lifetime
  └─→ Return 204 No Content
  ↓
[Client discards token]
  ↓
Subsequent Request with same token
  ↓
Auth Middleware
  ├─→ Verify JWT signature ✅
  ├─→ Check blacklist 🆕
  │   • GET blacklist:{token}
  │   • If exists → 401 Unauthorized
  └─→ Allow request ✅
```

#### 5.1.3 Implementation

**File**: `src/middleware/jwtBlacklist.ts` (NEW)

```typescript
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';
import jwt from 'jsonwebtoken';

/**
 * Add JWT token to blacklist
 * Token is automatically removed after expiration
 */
export const blacklistToken = async (token: string): Promise<void> => {
  const redisClient = await getRedisClient();

  if (!redisClient) {
    logger.warn('Redis not available, token blacklist disabled');
    return;
  }

  try {
    // Decode token to get expiration
    const decoded = jwt.decode(token) as jwt.JwtPayload;

    if (!decoded || !decoded.exp) {
      logger.warn('Invalid token, cannot blacklist');
      return;
    }

    // Calculate TTL (time until expiration)
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    if (ttl <= 0) {
      logger.info('Token already expired, no need to blacklist');
      return;
    }

    // Add to blacklist with TTL
    const key = `blacklist:${token}`;
    await redisClient.setEx(key, ttl, '1');

    logger.info({ ttl }, 'Token blacklisted');
  } catch (error) {
    logger.error({ error }, 'Failed to blacklist token');
  }
};

/**
 * Check if JWT token is blacklisted
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const redisClient = await getRedisClient();

  if (!redisClient) {
    // If Redis unavailable, cannot enforce blacklist
    return false;
  }

  try {
    const key = `blacklist:${token}`;
    const result = await redisClient.get(key);
    return result !== null;
  } catch (error) {
    logger.error({ error }, 'Failed to check token blacklist');
    return false; // Fail open to maintain availability
  }
};
```

**Update**: `src/middleware/auth.ts`

```typescript
import { isTokenBlacklisted } from './jwtBlacklist';

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify JWT signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // 🆕 Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      logger.warn({ userId: decoded.userId }, 'Blacklisted token used');
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Extract user context (existing logic)
    req.context = {
      userId: decoded.sub || decoded.userId,
      partnerId: decoded.iss || decoded.partnerId
    };

    next();
  } catch (error) {
    logger.error({ error }, 'JWT verification failed');
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Logout Endpoint**: `src/routes/users.ts`

```typescript
import { blacklistToken } from '../middleware/jwtBlacklist';

// Update logout endpoint (remove from stubs.ts)
router.post('/:userId/logout', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Verify user is logging out their own session
    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      await blacklistToken(token);
    }

    logger.info({ userId }, 'User logged out');
    return res.status(204).send();
  } catch (error) {
    logger.error({ error }, 'Logout failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Remove from Stubs**: Delete logout from `src/routes/stubs.ts`

#### 5.1.4 Testing

**Test**: `tests/integration/auth.test.ts`

```typescript
describe('JWT Blacklist', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create user and get token
    const user = await prisma.user.create({
      data: { /* ... */ }
    });
    userId = user.id.toString();
    authToken = generateToken(userId);
  });

  it('should allow requests with valid token', async () => {
    const res = await request(app)
      .get(`/api/v2/users/${userId}/accounts/all`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
  });

  it('should blacklist token on logout', async () => {
    const res = await request(app)
      .post(`/api/v2/users/${userId}/logout`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(204);
  });

  it('should reject blacklisted token', async () => {
    const res = await request(app)
      .get(`/api/v2/users/${userId}/accounts/all`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token has been revoked');
  });
});
```

### 5.2 Ads System

#### 5.2.1 Requirements

**Use Case**: Serve targeted promotional content to users

**Features**:
- Partner-specific ads
- User targeting (all users or specific IDs)
- Priority-based ordering
- Active/inactive status
- Date-based scheduling (start/end dates)

**API Endpoint**: `GET /api/v2/users/:userId/ads`

#### 5.2.2 Data Model

**Schema**: `prisma/schema.prisma` (extend)

```prisma
model Ad {
  id              BigInt   @id @default(autoincrement())
  partnerId       BigInt
  title           String   @db.VarChar(255)
  description     String   @db.Text
  imageUrl        String?  @db.VarChar(1000)
  actionUrl       String   @db.VarChar(1000)
  actionText      String   @db.VarChar(100) @default("Learn More")
  priority        Int      @default(0)
  active          Boolean  @default(true)
  targetAllUsers  Boolean  @default(true)
  targetUserIds   BigInt[] @default([])
  startDate       DateTime
  endDate         DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  partner Partner @relation(fields: [partnerId], references: [id])

  @@index([partnerId, active, startDate, endDate])
  @@index([priority])
  @@map("ads")
}
```

**Migration**:
```bash
npx prisma migrate dev --name add-ads-system
```

#### 5.2.3 Implementation

**Service**: `src/services/adService.ts` (NEW)

```typescript
import { prisma } from '../config/database';
import { Ad } from '@prisma/client';

/**
 * Get active ads for a user
 * Returns ads targeted to all users or specific user
 */
export const getAdsForUser = async (
  userId: bigint,
  partnerId: bigint
): Promise<Ad[]> => {
  const now = new Date();

  return await prisma.ad.findMany({
    where: {
      partnerId,
      active: true,
      startDate: { lte: now },
      endDate: { gte: now },
      OR: [
        { targetAllUsers: true },
        { targetUserIds: { has: userId } }
      ]
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  });
};
```

**Controller**: `src/controllers/adsController.ts` (NEW)

```typescript
import { Request, Response } from 'express';
import * as adService from '../services/adService';
import { logger } from '../config/logger';
import { serialize } from '../utils/serializers';

export const getAds = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(req.context!.userId);
    const partnerIdBigInt = BigInt(req.context!.partnerId);

    const ads = await adService.getAdsForUser(userIdBigInt, partnerIdBigInt);

    return res.json({ ads: ads.map(serialize) });
  } catch (error) {
    logger.error({ error }, 'Failed to get ads');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Routes**: Update `src/routes/users.ts`

```typescript
import * as adsController from '../controllers/adsController';

// Ads endpoint (remove from stubs)
router.get('/:userId/ads', authenticateJWT, adsController.getAds);
```

**Remove from Stubs**: Delete ads from `src/routes/stubs.ts`

#### 5.2.4 Admin API (Future Enhancement)

**CRUD Operations** (not in Phase 3 scope):
- POST /api/v2/partners/:partnerId/ads - Create ad
- PUT /api/v2/partners/:partnerId/ads/:id - Update ad
- DELETE /api/v2/partners/:partnerId/ads/:id - Delete ad

---

## 6. Integration Patterns

### 6.1 Middleware Chain Order

**Critical**: Middleware order determines request processing flow

```typescript
// src/index.ts - Correct Order

1. CORS Handler                    // Allow cross-origin requests
2. Body Parser                     // Parse JSON/URL-encoded bodies
3. Cache Control                   // Add no-cache headers
4. Partner Rate Limiter 🆕         // Prevent partner-level abuse
5. Request Logger                  // Log all requests
6. Route Dispatcher                // Match route
7. Authentication Middleware       // Verify JWT, add context
8. JWT Blacklist Check 🆕          // Check token revocation (Phase 3)
9. User Rate Limiter 🆕            // Prevent user-level abuse
10. Pagination Middleware 🆕       // Parse pagination params (list endpoints)
11. Controller Handler             // Execute business logic
12. Error Handler                  // Catch and format errors
```

**Rationale**:
- Partner rate limiting before auth: Prevents authentication attempts from counting against user quota
- User rate limiting after auth: Requires userId context
- Pagination after auth: Requires authentication for most list endpoints

### 6.2 Error Handling Strategy

**Consistent Error Responses**:

```typescript
// src/middleware/errorHandler.ts (existing, ensure compliance)

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error({ err, path: req.path }, 'Request error');

  // Rate limit errors (handled by rate-limit middleware)
  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retry_after: 900
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

### 6.3 Redis Connection Management

**Graceful Degradation**:

```typescript
// Strategy: If Redis fails, continue with reduced functionality

Rate Limiting:
  Redis available → Distributed rate limiting across instances ✅
  Redis unavailable → In-memory rate limiting (single instance) ⚠️

JWT Blacklist:
  Redis available → Token revocation enforced ✅
  Redis unavailable → Token revocation disabled (fail open) ⚠️
```

**Health Check**: Update `/health` endpoint

```typescript
app.get('/health', async (req, res) => {
  const redisClient = await getRedisClient();
  const redisStatus = redisClient?.isOpen ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected', // Assumed if request reaches here
      redis: redisStatus
    }
  });
});
```

---

## 7. Testing Architecture

### 7.1 Test Pyramid

```
        /\
       /  \
      / E2E\ (3 scenarios)
     /------\
    / Integration\ (9 suites, 202 tests)
   /--------------\
  /   Unit Tests   \ (5 suites, ~50 tests)
 /------------------\
```

**Distribution**:
- **70%** Integration: API endpoint testing with real database
- **20%** Unit: Service layer logic, utilities, middleware
- **10%** E2E: Critical user journeys (future)

### 7.2 Test Suite Organization

```
tests/
├── setup.ts                      # Global setup/teardown
├── helpers/
│   ├── authHelpers.ts            # JWT token generation
│   ├── dbHelpers.ts              # Database seeding utilities
│   └── requestHelpers.ts         # Supertest wrappers
├── unit/
│   ├── goalService.test.ts       ✅ Existing
│   ├── rateLimit.test.ts         🆕 Phase 2
│   ├── pagination.test.ts        🆕 Phase 2
│   ├── jwtBlacklist.test.ts      🆕 Phase 3 (optional)
│   └── serializers.test.ts       🆕 Future
├── integration/
│   ├── accounts.test.ts          ✅ Existing
│   ├── alerts.test.ts            ✅ Existing
│   ├── budgets.test.ts           🆕 Future
│   ├── cashflow.test.ts          ✅ Existing
│   ├── expenses.test.ts          ✅ Existing
│   ├── goals.test.ts             ✅ Existing
│   ├── networth.test.ts          ✅ Existing
│   ├── tags.test.ts              ✅ Existing
│   ├── transactions.test.ts      🆕 Future
│   └── auth.test.ts              🆕 Phase 3 (logout)
└── e2e/
    ├── userJourney.test.ts       🆕 Future
    ├── budgetCreation.test.ts    🆕 Future
    └── goalTracking.test.ts      🆕 Future
```

### 7.3 Phase-Specific Test Requirements

**Phase 1 Tests**:
- ✅ Fix existing 202 tests to pass
- No new tests required

**Phase 2 Tests**:

```typescript
// tests/unit/rateLimit.test.ts
describe('Rate Limiting Middleware', () => {
  describe('Partner Rate Limiter', () => {
    it('should return rate limit headers');
    it('should block after 1000 requests per hour');
    it('should reset after window expires');
  });

  describe('User Rate Limiter', () => {
    it('should block after 100 requests per 15 minutes');
    it('should use userId as key');
  });
});

// tests/unit/pagination.test.ts
describe('Pagination Middleware', () => {
  it('should parse page and per_page');
  it('should calculate correct offset');
  it('should enforce max per_page of 100');
  it('should default to page=1, per_page=25');
});

// tests/integration/transactions.test.ts (extend)
describe('GET /transactions/search with pagination', () => {
  it('should return paginated results');
  it('should include meta object');
  it('should handle page boundaries correctly');
});
```

**Phase 3 Tests**:

```typescript
// tests/integration/auth.test.ts
describe('JWT Blacklist', () => {
  it('should blacklist token on logout');
  it('should reject blacklisted token');
  it('should allow requests before logout');
});

// tests/integration/ads.test.ts
describe('GET /users/:userId/ads', () => {
  it('should return active ads for user');
  it('should respect date range');
  it('should order by priority');
  it('should filter by user targeting');
});
```

### 7.4 Performance Testing

**Load Tests** (after Phase 2):

```bash
# Install artillery
npm install -g artillery

# Create load test config
cat > artillery.yml <<EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 20
  processor: "./test-processor.js"

scenarios:
  - name: "Transaction Search"
    flow:
      - get:
          url: "/api/v2/users/1/transactions/search?q=test"
          headers:
            Authorization: "Bearer {{token}}"
EOF

# Run load test
artillery run artillery.yml
```

**Success Criteria**:
- p95 latency < 200ms
- p99 latency < 500ms
- 0% error rate under normal load
- Rate limiting triggers correctly at thresholds

---

## 8. Deployment Architecture

### 8.1 Environment Configuration

**Environment Variables**:

```bash
# Existing (Phase 0-1)
DATABASE_URL=postgresql://user:pass@localhost:5432/pfm
JWT_SECRET=your-secret-key-min-32-chars
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
ENABLE_CORS=true
CORS_ORIGINS=https://app.example.com,https://www.example.com

# New (Phase 2)
REDIS_URL=redis://localhost:6379                    # 🆕 Required for Phase 2
RATE_LIMIT_PARTNER_MAX=1000                         # 🆕 Optional (default: 1000)
RATE_LIMIT_PARTNER_WINDOW_MS=3600000                # 🆕 Optional (default: 1 hour)
RATE_LIMIT_USER_MAX=100                             # 🆕 Optional (default: 100)
RATE_LIMIT_USER_WINDOW_MS=900000                    # 🆕 Optional (default: 15 min)

# New (Phase 3 - Optional)
ENABLE_JWT_BLACKLIST=true                           # 🆕 Optional (default: false)
```

### 8.2 Infrastructure Requirements

**Development**:
```
- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (Phase 2+)
```

**Production**:
```
Application Servers:
  - 2+ instances (horizontal scaling)
  - PM2 or Docker containers
  - Load balancer (nginx/ALB)

Database:
  - PostgreSQL 15+ (RDS/managed)
  - Connection pooling (PgBouncer)
  - Read replicas (future)

Cache:
  - Redis 7+ (ElastiCache/managed)
  - Cluster mode for HA
  - Backup/persistence enabled
```

### 8.3 Deployment Checklist

**Phase 1 Deployment**:
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Build application: `npm run build`
- [ ] Run tests: `npm test`
- [ ] Deploy to staging
- [ ] Verify all 202 tests pass in staging
- [ ] Smoke test critical endpoints
- [ ] Deploy to production

**Phase 2 Deployment**:
- [ ] Provision Redis instance
- [ ] Set REDIS_URL environment variable
- [ ] Test Redis connectivity: `redis-cli ping`
- [ ] Deploy with rate limiting enabled
- [ ] Monitor rate limit headers in responses
- [ ] Verify rate limiting triggers at thresholds
- [ ] Load test: 1000+ requests/hour

**Phase 3 Deployment**:
- [ ] Run Prisma migration for ads table
- [ ] Deploy JWT blacklist feature (if enabled)
- [ ] Test logout → blacklist → rejection flow
- [ ] Seed initial ads data (if using ads)
- [ ] Monitor Redis memory usage

### 8.4 Monitoring & Observability

**Key Metrics**:

```typescript
// Application metrics to track
{
  "http_requests_total": counter,
  "http_request_duration_seconds": histogram,
  "rate_limit_hits_total": counter,
  "jwt_blacklist_checks_total": counter,
  "redis_operations_total": counter,
  "prisma_queries_duration_seconds": histogram
}
```

**Health Checks**:
- `/health` endpoint returns 200
- Database connection active
- Redis connection active (if Phase 2+)

**Alerts**:
- Error rate > 1%
- p95 latency > 500ms
- Database connection pool exhausted
- Redis connection failures
- Rate limit threshold reached

---

## 9. Security Considerations

### 9.1 Rate Limiting Security

**Threat**: API abuse, DDoS attacks

**Mitigation**:
- Partner-level: 1000 req/hour prevents partner abuse
- User-level: 100 req/15min prevents individual user abuse
- IP-based fallback for unauthenticated requests
- Redis-backed for distributed enforcement

**Limitations**:
- Does not prevent distributed DDoS (use CloudFlare/WAF)
- In-memory fallback vulnerable if Redis down

### 9.2 JWT Blacklist Security

**Threat**: Token theft, session hijacking

**Mitigation**:
- Logout immediately invalidates token
- Stolen tokens can be blacklisted manually
- TTL ensures automatic cleanup

**Limitations**:
- If Redis compromised, blacklist ineffective
- Short-lived tokens (1 hour) reduce exposure window
- Consider refresh tokens for better security (future)

### 9.3 Pagination Security

**Threat**: Resource exhaustion via large page requests

**Mitigation**:
- Max per_page: 100 (enforced)
- Database query limits prevent unbounded queries

### 9.4 Redis Security

**Configuration**:
```bash
# Redis hardening
requirepass your-strong-password
bind 127.0.0.1 ::1
protected-mode yes
maxmemory 512mb
maxmemory-policy allkeys-lru
```

**Network Security**:
- Use TLS for Redis connections in production
- Firewall rules: Only app servers can reach Redis
- VPC isolation

---

## 10. Appendices

### Appendix A: File Inventory

**New Files (Phase 2)**:
```
src/
├── config/
│   └── redis.ts                  # Redis client management
├── middleware/
│   ├── rateLimit.ts              # Rate limiting middleware
│   └── pagination.ts             # Pagination helpers
tests/
├── unit/
│   ├── rateLimit.test.ts         # Rate limit tests
│   └── pagination.test.ts        # Pagination tests
```

**New Files (Phase 3)**:
```
src/
├── middleware/
│   └── jwtBlacklist.ts           # JWT blacklist logic
├── services/
│   └── adService.ts              # Ads business logic
├── controllers/
│   └── adsController.ts          # Ads HTTP handlers
tests/
├── integration/
│   ├── auth.test.ts              # Logout/blacklist tests
│   └── ads.test.ts               # Ads endpoint tests
```

**Modified Files**:
```
src/
├── index.ts                      # Add middleware, Redis disconnect
├── routes/
│   ├── stubs.ts                  # Remove dead code
│   ├── users.ts                  # Add logout endpoint
│   └── transactions.ts           # Add pagination
├── middleware/
│   └── auth.ts                   # Add blacklist check
├── controllers/
│   └── transactionsController.ts # Add pagination logic
├── services/
│   └── transactionService.ts     # Add count function
prisma/
└── schema.prisma                 # Add Ad model (Phase 3)
```

### Appendix B: Dependencies

**Phase 2 Dependencies**:
```json
{
  "dependencies": {
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    "redis": "^4.6.12"
  }
}
```

**Installation**:
```bash
npm install express-rate-limit rate-limit-redis redis
```

### Appendix C: Migration Scripts

**Ads System Migration** (Phase 3):

```prisma
-- CreateTable
CREATE TABLE "ads" (
    "id" BIGSERIAL NOT NULL,
    "partnerId" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" VARCHAR(1000),
    "actionUrl" VARCHAR(1000) NOT NULL,
    "actionText" VARCHAR(100) NOT NULL DEFAULT 'Learn More',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "targetAllUsers" BOOLEAN NOT NULL DEFAULT true,
    "targetUserIds" BIGINT[] DEFAULT ARRAY[]::BIGINT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ads_partnerId_active_startDate_endDate_idx"
  ON "ads"("partnerId", "active", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ads_priority_idx" ON "ads"("priority");

-- AddForeignKey
ALTER TABLE "ads"
  ADD CONSTRAINT "ads_partnerId_fkey"
  FOREIGN KEY ("partnerId")
  REFERENCES "partners"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

### Appendix D: Success Criteria Summary

**Phase 1 Complete**:
- ✅ All 202 tests passing (0 failures)
- ✅ stubs.ts contains only unimplemented features
- ✅ Documentation updated to 98%
- ✅ Clean build (0 TypeScript errors)

**Phase 2 Complete**:
- ✅ Rate limiting active with correct headers
- ✅ Pagination working on all list endpoints
- ✅ Redis connection stable
- ✅ Load test passed (1000 req/hour sustained)

**Phase 3 Complete**:
- ✅ Logout invalidates JWT tokens
- ✅ Ads system serves targeted content
- ✅ All new tests passing

---

**Document Status**: ✅ Ready for Implementation
**Review Status**: Pending Technical Review
**Approval**: Pending Product Owner Approval

---

**End of Architecture Specification**
