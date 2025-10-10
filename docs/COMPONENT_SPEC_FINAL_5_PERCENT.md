# Component Specification: Final 5% Implementation

**Document Version**: 1.0
**Date**: 2025-10-04
**Status**: Design Specification
**Purpose**: Detailed component interfaces, contracts, and implementation guidance

---

## Table of Contents

1. [Overview](#1-overview)
2. [Middleware Components](#2-middleware-components)
3. [Service Components](#3-service-components)
4. [Controller Components](#4-controller-components)
5. [Utility Components](#5-utility-components)
6. [Configuration Components](#6-configuration-components)
7. [Type Definitions](#7-type-definitions)
8. [Component Interaction](#8-component-interaction)
9. [Testing Components](#9-testing-components)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Overview

### 1.1 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Express Application                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │         Middleware Components (Phase 2)         │   │
│  │  • RateLimitMiddleware (partner + user)        │   │
│  │  • PaginationMiddleware                         │   │
│  │  • JWTBlacklistMiddleware (Phase 3)            │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │         Configuration Components                │   │
│  │  • RedisClient                                  │   │
│  │  • RateLimiterFactory                          │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │         Service Components (Phase 3)            │   │
│  │  • AdService                                    │   │
│  │  • JWTBlacklistService                         │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │         Controller Components (Phase 3)         │   │
│  │  • AdsController                                │   │
│  │  • LogoutController (enhanced)                  │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │         Utility Components                      │   │
│  │  • PaginationHelper                             │   │
│  │  • RateLimitTracker                            │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Component Catalog

| Component | Phase | Type | Dependencies | Purpose |
|-----------|-------|------|--------------|---------|
| `RedisClient` | 2 | Config | redis | Redis connection management |
| `RateLimitMiddleware` | 2 | Middleware | RedisClient | Rate limiting enforcement |
| `PaginationMiddleware` | 2 | Middleware | - | Pagination parameter parsing |
| `PaginationHelper` | 2 | Utility | - | Response formatting |
| `JWTBlacklistService` | 3 | Service | RedisClient | Token revocation |
| `JWTBlacklistMiddleware` | 3 | Middleware | JWTBlacklistService | Token validation |
| `AdService` | 3 | Service | Prisma | Ad business logic |
| `AdsController` | 3 | Controller | AdService | Ad HTTP handlers |

### 1.3 Design Principles

**Component Design**:
- Single Responsibility Principle
- Dependency Injection
- Interface-based contracts
- Testability first
- Error handling at boundaries

**Type Safety**:
- Strong TypeScript typing
- No `any` types in public interfaces
- Explicit error types
- Generic type parameters where appropriate

---

## 2. Middleware Components

### 2.1 RateLimitMiddleware

#### 2.1.1 Interface Specification

**Module**: `src/middleware/rateLimit.ts`

**Purpose**: Enforce request rate limits at partner and user levels

**Dependencies**:
- `express-rate-limit`: Rate limiting library
- `rate-limit-redis`: Redis store adapter
- `RedisClient`: Redis connection manager

**Exports**:
```typescript
export async function createPartnerRateLimiter(): Promise<RateLimitRequestHandler>;
export async function createUserRateLimiter(): Promise<RateLimitRequestHandler>;
```

#### 2.1.2 Component Contract

**Function**: `createPartnerRateLimiter()`

```typescript
/**
 * Creates partner-level rate limiter middleware
 *
 * @returns Express middleware that enforces 1000 requests/hour per partner
 *
 * @remarks
 * - Applied before authentication to prevent abuse
 * - Uses partnerId from JWT context if available, otherwise IP
 * - Backed by Redis in production, in-memory in development
 * - Returns 429 status when limit exceeded
 * - Adds RateLimit-* headers to all responses
 *
 * @example
 * ```typescript
 * const partnerLimiter = await createPartnerRateLimiter();
 * app.use('/api/v2', partnerLimiter);
 * ```
 */
async function createPartnerRateLimiter(): Promise<RateLimitRequestHandler>
```

**Configuration**:
```typescript
interface PartnerRateLimitConfig {
  windowMs: 3600000;        // 1 hour in milliseconds
  max: 1000;                 // 1000 requests per window
  keyGenerator: (req) => string;  // partnerId or IP
  standardHeaders: true;     // Use standard RateLimit-* headers
  legacyHeaders: false;      // Don't use X-RateLimit-* headers
}
```

**Function**: `createUserRateLimiter()`

```typescript
/**
 * Creates user-level rate limiter middleware
 *
 * @returns Express middleware that enforces 100 requests/15min per user
 *
 * @remarks
 * - Applied after authentication to user-specific routes
 * - Uses userId from JWT context
 * - Backed by Redis in production, in-memory in development
 * - Skips health check endpoint
 * - Returns 429 status when limit exceeded
 *
 * @example
 * ```typescript
 * const userLimiter = await createUserRateLimiter();
 * app.use('/api/v2/users', userLimiter);
 * ```
 */
async function createUserRateLimiter(): Promise<RateLimitRequestHandler>
```

**Configuration**:
```typescript
interface UserRateLimitConfig {
  windowMs: 900000;          // 15 minutes in milliseconds
  max: 100;                  // 100 requests per window
  keyGenerator: (req) => string;  // userId from context
  skip: (req) => boolean;    // Skip health checks
  standardHeaders: true;
  legacyHeaders: false;
}
```

#### 2.1.3 Internal Components

**Helper**: `createRateLimiter()`

```typescript
/**
 * Factory function for creating rate limiter with common configuration
 *
 * @param options - Rate limiter options
 * @returns Configured rate limit middleware
 *
 * @internal
 */
async function createRateLimiter(
  options: RateLimitOptions
): Promise<RateLimitRequestHandler> {
  const redisClient = await getRedisClient();

  return rateLimit({
    windowMs: options.windowMs || 900000,
    max: options.max || 100,
    message: {
      error: 'Rate limit exceeded',
      retry_after: Math.ceil((options.windowMs || 900000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    skip: options.skip,
    ...(redisClient ? {
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:',
        sendCommand: (...args: string[]) => redisClient.sendCommand(args)
      })
    } : {})
  });
}
```

**Type**: `RateLimitOptions`

```typescript
interface RateLimitOptions {
  windowMs?: number;                      // Time window in ms
  max?: number;                           // Max requests in window
  keyGenerator?: (req: Request) => string; // Key generation function
  skip?: (req: Request) => boolean;       // Skip predicate
}
```

#### 2.1.4 Error Handling

**Rate Limit Exceeded**:
```typescript
// Automatic handling by middleware
handler: (req, res) => {
  logger.warn({
    ip: req.ip,
    userId: req.context?.userId,
    partnerId: req.context?.partnerId,
    path: req.path
  }, 'Rate limit exceeded');

  res.status(429).json({
    error: 'Rate limit exceeded',
    retry_after: Math.ceil(windowMs / 1000)
  });
}
```

**Redis Connection Failure**:
```typescript
// Graceful degradation to in-memory store
// Logged but does not throw error
// Rate limiting still works, but not distributed
```

#### 2.1.5 Testing Interface

```typescript
// Test helper for rate limit testing
export async function resetRateLimits(): Promise<void> {
  const redisClient = await getRedisClient();
  if (redisClient) {
    await redisClient.flushDb();
  }
}
```

---

### 2.2 PaginationMiddleware

#### 2.2.1 Interface Specification

**Module**: `src/middleware/pagination.ts`

**Purpose**: Parse and validate pagination query parameters

**Dependencies**: None (pure utility)

**Exports**:
```typescript
export const paginationMiddleware: RequestHandler;
export function createPaginationMeta(totalCount: number, pagination: PaginationParams): PaginationMeta;
export function paginatedResponse<T>(data: T[], totalCount: number, pagination: PaginationParams, resourceKey?: string): PaginatedResponse<T>;
```

#### 2.2.2 Component Contract

**Middleware**: `paginationMiddleware`

```typescript
/**
 * Parses pagination query parameters and attaches to request
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 *
 * @remarks
 * - Parses 'page' and 'per_page' query parameters
 * - Defaults: page=1, per_page=25
 * - Constraints: page >= 1, 1 <= per_page <= 100
 * - Calculates offset for database queries
 * - Attaches result to req.pagination
 *
 * @example
 * ```typescript
 * router.get('/search', authenticateJWT, paginationMiddleware, searchHandler);
 * ```
 */
const paginationMiddleware: RequestHandler = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 25));
  const offset = (page - 1) * perPage;

  req.pagination = {
    page,
    perPage,
    offset,
    limit: perPage
  };

  next();
};
```

**Function**: `createPaginationMeta()`

```typescript
/**
 * Creates pagination metadata object
 *
 * @param totalCount - Total number of items across all pages
 * @param pagination - Pagination parameters from request
 * @returns Pagination metadata for response
 *
 * @example
 * ```typescript
 * const meta = createPaginationMeta(95, req.pagination);
 * // { current_page: 1, per_page: 25, total_pages: 4, total_count: 95 }
 * ```
 */
function createPaginationMeta(
  totalCount: number,
  pagination: PaginationParams
): PaginationMeta {
  return {
    current_page: pagination.page,
    per_page: pagination.perPage,
    total_pages: Math.ceil(totalCount / pagination.perPage) || 1,
    total_count: totalCount
  };
}
```

**Function**: `paginatedResponse()`

```typescript
/**
 * Creates standardized paginated response structure
 *
 * @param data - Array of resources for current page
 * @param totalCount - Total number of resources across all pages
 * @param pagination - Pagination parameters from request
 * @param resourceKey - Key name for resources array (default: 'resources')
 * @returns Paginated response object with data and meta
 *
 * @example
 * ```typescript
 * const response = paginatedResponse(
 *   transactions,
 *   totalCount,
 *   req.pagination,
 *   'transactions'
 * );
 * res.json(response);
 * ```
 */
function paginatedResponse<T>(
  data: T[],
  totalCount: number,
  pagination: PaginationParams,
  resourceKey: string = 'resources'
): PaginatedResponse<T> {
  return {
    [resourceKey]: data,
    meta: createPaginationMeta(totalCount, pagination)
  };
}
```

#### 2.2.3 Type Definitions

```typescript
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
 * Pagination metadata for API responses
 */
export interface PaginationMeta {
  current_page: number;   // Current page number
  per_page: number;       // Items per page
  total_pages: number;    // Total number of pages
  total_count: number;    // Total items across all pages
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  [resourceKey: string]: T[];  // Resource array
  meta: PaginationMeta;         // Pagination metadata
}
```

#### 2.2.4 Validation Rules

**Page Validation**:
```typescript
// Ensure page is positive integer
const page = Math.max(1, parseInt(req.query.page as string) || 1);
// Min: 1, Default: 1
```

**Per Page Validation**:
```typescript
// Ensure per_page is between 1 and 100
const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 25));
// Min: 1, Max: 100, Default: 25
```

**Offset Calculation**:
```typescript
// Convert 1-indexed page to 0-indexed database offset
const offset = (page - 1) * perPage;
// Page 1: offset 0
// Page 2: offset 25 (if perPage=25)
```

---

### 2.3 JWTBlacklistMiddleware (Phase 3)

#### 2.3.1 Interface Specification

**Module**: `src/middleware/jwtBlacklist.ts`

**Purpose**: Check if JWT tokens have been revoked (blacklisted)

**Dependencies**:
- `RedisClient`: Token storage
- `jsonwebtoken`: JWT decoding

**Exports**:
```typescript
export async function blacklistToken(token: string): Promise<void>;
export async function isTokenBlacklisted(token: string): Promise<boolean>;
```

#### 2.3.2 Component Contract

**Function**: `blacklistToken()`

```typescript
/**
 * Adds JWT token to blacklist
 *
 * @param token - JWT token string to blacklist
 * @returns Promise that resolves when token is blacklisted
 *
 * @remarks
 * - Decodes token to extract expiration time
 * - Calculates TTL (time until token expires)
 * - Stores in Redis with automatic expiration
 * - If token already expired, does nothing
 * - If Redis unavailable, logs warning but doesn't throw
 *
 * @example
 * ```typescript
 * await blacklistToken('eyJhbGciOiJIUzI1NiIs...');
 * ```
 */
async function blacklistToken(token: string): Promise<void> {
  const redisClient = await getRedisClient();

  if (!redisClient) {
    logger.warn('Redis not available, token blacklist disabled');
    return;
  }

  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload;

    if (!decoded || !decoded.exp) {
      logger.warn('Invalid token, cannot blacklist');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    if (ttl <= 0) {
      logger.info('Token already expired, no need to blacklist');
      return;
    }

    const key = `blacklist:${token}`;
    await redisClient.setEx(key, ttl, '1');

    logger.info({ ttl }, 'Token blacklisted');
  } catch (error) {
    logger.error({ error }, 'Failed to blacklist token');
  }
}
```

**Function**: `isTokenBlacklisted()`

```typescript
/**
 * Checks if JWT token is blacklisted
 *
 * @param token - JWT token string to check
 * @returns Promise resolving to true if blacklisted, false otherwise
 *
 * @remarks
 * - Checks Redis for token presence
 * - Returns false if Redis unavailable (fail open)
 * - Returns false on error to maintain availability
 *
 * @example
 * ```typescript
 * if (await isTokenBlacklisted(token)) {
 *   return res.status(401).json({ error: 'Token has been revoked' });
 * }
 * ```
 */
async function isTokenBlacklisted(token: string): Promise<boolean> {
  const redisClient = await getRedisClient();

  if (!redisClient) {
    return false; // Fail open if Redis unavailable
  }

  try {
    const key = `blacklist:${token}`;
    const result = await redisClient.get(key);
    return result !== null;
  } catch (error) {
    logger.error({ error }, 'Failed to check token blacklist');
    return false; // Fail open on error
  }
}
```

#### 2.3.3 Integration with Auth Middleware

**Modified**: `src/middleware/auth.ts`

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

    // NEW: Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      logger.warn({ userId: decoded.userId }, 'Blacklisted token used');
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Extract user context
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

#### 2.3.4 Error Handling

**Redis Unavailable**:
```typescript
// Strategy: Fail open (allow request)
// Rationale: Maintain availability over perfect security
// Logged: Yes, at WARN level
```

**Invalid Token Format**:
```typescript
// Strategy: Log warning, do not throw
// Behavior: Token not blacklisted, but will fail JWT verification anyway
```

**Expired Token**:
```typescript
// Strategy: Skip blacklisting
// Behavior: Token already invalid, no Redis operation needed
```

---

## 3. Service Components

### 3.1 AdService (Phase 3)

#### 3.1.1 Interface Specification

**Module**: `src/services/adService.ts`

**Purpose**: Business logic for ad retrieval and targeting

**Dependencies**:
- `@prisma/client`: Database access
- `prisma`: Database client instance

**Exports**:
```typescript
export async function getAdsForUser(userId: bigint, partnerId: bigint): Promise<Ad[]>;
```

#### 3.1.2 Component Contract

**Function**: `getAdsForUser()`

```typescript
/**
 * Retrieves active ads targeted to a specific user
 *
 * @param userId - User ID for targeting
 * @param partnerId - Partner ID for filtering
 * @returns Promise resolving to array of active ads
 *
 * @remarks
 * - Filters by partnerId (only partner's ads)
 * - Filters by active status (active = true)
 * - Filters by date range (current time within start/end dates)
 * - Filters by targeting (all users OR specific user in targetUserIds)
 * - Orders by priority DESC, createdAt DESC
 *
 * @example
 * ```typescript
 * const ads = await getAdsForUser(BigInt(123), BigInt(45));
 * // Returns active, targeted ads for user 123 from partner 45
 * ```
 */
export async function getAdsForUser(
  userId: bigint,
  partnerId: bigint
): Promise<Ad[]> {
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
}
```

#### 3.1.3 Business Rules

**Filtering Logic**:
```typescript
// Ad must meet ALL conditions:
1. partnerId === user.partnerId        // Partner-specific
2. active === true                      // Active status
3. startDate <= NOW                     // Has started
4. endDate >= NOW                       // Not expired
5. (targetAllUsers === true             // Targets all users
    OR userId IN targetUserIds)         // OR targets specific user
```

**Ordering Logic**:
```typescript
// Primary: priority DESC (higher priority first)
// Secondary: createdAt DESC (newer first within same priority)
```

**Data Access Pattern**:
```typescript
// Single database query
// Uses compound index: (partnerId, active, startDate, endDate)
// Efficient filtering with priority index for sorting
```

#### 3.1.4 Future Enhancements (Not in Phase 3)

**Ad Click Tracking**:
```typescript
export async function trackAdClick(
  userId: bigint,
  adId: bigint
): Promise<void> {
  // Create AdClick record
  // Increment click counter
  // Update last_clicked_at timestamp
}
```

**Ad Impression Tracking**:
```typescript
export async function trackAdImpression(
  userId: bigint,
  adId: bigint
): Promise<void> {
  // Create AdImpression record
  // Increment view counter
}
```

**Ad Analytics**:
```typescript
export async function getAdAnalytics(
  partnerId: bigint,
  adId: bigint,
  startDate: Date,
  endDate: Date
): Promise<AdAnalytics> {
  // Return impressions, clicks, CTR, conversion rate
}
```

---

## 4. Controller Components

### 4.1 AdsController (Phase 3)

#### 4.1.1 Interface Specification

**Module**: `src/controllers/adsController.ts`

**Purpose**: HTTP handlers for ad endpoints

**Dependencies**:
- `AdService`: Business logic
- `Logger`: Logging
- `Serializers`: Response formatting

**Exports**:
```typescript
export async function getAds(req: Request, res: Response): Promise<void>;
```

#### 4.1.2 Component Contract

**Handler**: `getAds()`

```typescript
/**
 * GET /api/v2/users/:userId/ads
 * Retrieves ads for authenticated user
 *
 * @param req - Express request with userId param and auth context
 * @param res - Express response
 * @returns Promise resolving when response sent
 *
 * @remarks
 * - Requires authentication (authenticateJWT middleware)
 * - Validates userId matches authenticated user
 * - Returns 403 if user tries to get another user's ads
 * - Returns 500 on service errors
 *
 * @example
 * Request:
 *   GET /api/v2/users/123/ads
 *   Authorization: Bearer {token}
 *
 * Response (200):
 *   {
 *     "ads": [
 *       {
 *         "id": 1001,
 *         "title": "Savings Account Promotion",
 *         ...
 *       }
 *     ]
 *   }
 */
export async function getAds(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    // Authorization check
    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(req.context!.userId);
    const partnerIdBigInt = BigInt(req.context!.partnerId);

    // Retrieve ads
    const ads = await adService.getAdsForUser(userIdBigInt, partnerIdBigInt);

    // Serialize and return
    return res.json({ ads: ads.map(serialize) });
  } catch (error) {
    logger.error({ error }, 'Failed to get ads');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### 4.1.3 Request Flow

```
1. Request received: GET /api/v2/users/123/ads
   ↓
2. Authentication middleware: Verify JWT, extract userId/partnerId
   ↓
3. AdsController.getAds(): Validate authorization
   ↓
4. AdService.getAdsForUser(): Query database
   ↓
5. Serializer: Format response
   ↓
6. Response sent: { ads: [...] }
```

#### 4.1.4 Error Handling

**403 Forbidden**:
```typescript
// Condition: userId param !== authenticated userId
// Response: { error: 'Forbidden' }
// Status: 403
```

**500 Internal Server Error**:
```typescript
// Condition: Database error, service exception
// Response: { error: 'Internal server error' }
// Status: 500
// Logged: Yes, at ERROR level with full error details
```

---

### 4.2 LogoutController (Phase 3)

#### 4.2.1 Interface Specification

**Module**: `src/routes/users.ts` (inline controller)

**Purpose**: Handle user logout and token blacklisting

**Dependencies**:
- `JWTBlacklistService`: Token revocation
- `Logger`: Logging

**Handler**: Logout endpoint

```typescript
/**
 * POST /api/v2/users/:userId/logout
 * Logs out user and blacklists JWT token
 *
 * @param req - Express request with userId param and auth header
 * @param res - Express response
 * @returns Promise resolving when response sent
 *
 * @remarks
 * - Requires authentication (authenticateJWT middleware)
 * - Validates userId matches authenticated user
 * - Extracts token from Authorization header
 * - Blacklists token in Redis
 * - Returns 204 No Content on success
 *
 * @example
 * Request:
 *   POST /api/v2/users/123/logout
 *   Authorization: Bearer {token}
 *
 * Response (204):
 *   (empty body)
 */
router.post('/:userId/logout', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Authorization check
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

#### 4.2.2 Request Flow

```
1. Request: POST /api/v2/users/123/logout
   ↓
2. Auth middleware: Verify JWT (must be valid)
   ↓
3. Logout handler: Validate userId matches
   ↓
4. Extract token from Authorization header
   ↓
5. JWTBlacklistService.blacklistToken()
   ↓
6. Response: 204 No Content
```

#### 4.2.3 Edge Cases

**Already Logged Out**:
```typescript
// Behavior: Idempotent - blacklisting again is safe
// Response: 204 No Content (success)
```

**Token Missing**:
```typescript
// Condition: No Authorization header (shouldn't happen after auth middleware)
// Behavior: Skip blacklisting, still return 204
// Rationale: Client-side logout is sufficient
```

**Expired Token**:
```typescript
// Condition: Token exp < current time
// Behavior: JWTBlacklistService skips Redis operation
// Response: 204 No Content
// Rationale: Token already invalid
```

---

## 5. Utility Components

### 5.1 PaginationHelper

#### 5.1.1 Component Overview

**Module**: Integrated in `src/middleware/pagination.ts`

**Purpose**: Helper functions for pagination calculations and formatting

**Already Documented**: See section 2.2 (PaginationMiddleware)

---

### 5.2 RateLimitTracker

#### 5.2.1 Interface Specification

**Module**: Integrated in `src/middleware/rateLimit.ts`

**Purpose**: Track and log rate limit events

**Implementation**:

```typescript
/**
 * Logs rate limit hit events for monitoring
 *
 * @param req - Express request
 * @param info - Rate limit information
 *
 * @internal
 */
function logRateLimitHit(req: Request, info: RateLimitInfo): void {
  logger.warn({
    event: 'rate_limit_exceeded',
    ip: req.ip,
    userId: req.context?.userId,
    partnerId: req.context?.partnerId,
    path: req.path,
    method: req.method,
    limit: info.limit,
    current: info.current,
    remaining: info.remaining,
    resetTime: new Date(info.resetTime)
  }, 'Rate limit exceeded');
}
```

**Type Definition**:

```typescript
interface RateLimitInfo {
  limit: number;        // Maximum requests allowed
  current: number;      // Current request count
  remaining: number;    // Requests remaining (0 when hit)
  resetTime: number;    // Unix timestamp for window reset
}
```

---

## 6. Configuration Components

### 6.1 RedisClient

#### 6.1.1 Interface Specification

**Module**: `src/config/redis.ts`

**Purpose**: Manage Redis connection lifecycle

**Dependencies**:
- `redis`: Redis client library
- `Logger`: Logging

**Exports**:
```typescript
export async function getRedisClient(): Promise<RedisClientType | null>;
export async function disconnectRedis(): Promise<void>;
```

#### 6.1.2 Component Contract

**Function**: `getRedisClient()`

```typescript
/**
 * Gets or creates Redis client instance
 *
 * @returns Promise resolving to Redis client or null if unavailable
 *
 * @remarks
 * - Singleton pattern - returns existing client if connected
 * - Returns null in test environment
 * - Returns null if REDIS_URL not configured
 * - Attempts connection with retry logic
 * - Fails gracefully - returns null on connection failure
 * - Sets up event handlers for monitoring
 *
 * @example
 * ```typescript
 * const redis = await getRedisClient();
 * if (redis) {
 *   await redis.set('key', 'value');
 * }
 * ```
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
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

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis client disconnected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn({ error }, 'Failed to connect to Redis, using in-memory store');
    return null;
  }
}
```

**Function**: `disconnectRedis()`

```typescript
/**
 * Gracefully disconnects Redis client
 *
 * @returns Promise resolving when disconnected
 *
 * @remarks
 * - Called during application shutdown
 * - Waits for pending operations to complete
 * - Safe to call multiple times
 *
 * @example
 * ```typescript
 * process.on('SIGTERM', async () => {
 *   await disconnectRedis();
 *   process.exit(0);
 * });
 * ```
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    logger.info('Redis client disconnected');
  }
}
```

#### 6.1.3 Connection Management

**Retry Strategy**:
```typescript
socket: {
  reconnectStrategy: (retries) => {
    if (retries > 3) {
      return new Error('Redis unavailable');
    }
    return retries * 1000;  // 1s, 2s, 3s backoff
  }
}
```

**Event Handlers**:
```typescript
.on('error', fn)        // Log errors, don't throw
.on('connect', fn)      // Log successful connection
.on('reconnecting', fn) // Log reconnection attempts
.on('disconnect', fn)   // Log disconnections
```

**Graceful Degradation**:
```typescript
// If Redis fails to connect:
// 1. Log warning
// 2. Return null
// 3. Components use fallback (in-memory for rate limiting, disabled for blacklist)
// 4. Application continues to function
```

#### 6.1.4 Testing Interface

```typescript
/**
 * Flush all Redis data (test helper)
 *
 * @internal
 */
export async function flushRedis(): Promise<void> {
  const client = await getRedisClient();
  if (client) {
    await client.flushDb();
  }
}
```

---

## 7. Type Definitions

### 7.1 Express Request Extensions

**Module**: `src/types/express.d.ts`

```typescript
import { PaginationParams } from '../middleware/pagination';

declare global {
  namespace Express {
    interface Request {
      /**
       * JWT authentication context
       * Populated by authenticateJWT middleware
       */
      context?: {
        userId: string;      // User ID from JWT
        partnerId: string;   // Partner ID from JWT
      };

      /**
       * Pagination parameters
       * Populated by paginationMiddleware
       */
      pagination?: PaginationParams;
    }
  }
}

export {};
```

### 7.2 Ad Types

**Module**: `src/types/ad.ts` (NEW)

```typescript
/**
 * Ad model from Prisma
 */
export interface Ad {
  id: bigint;
  partnerId: bigint;
  title: string;
  description: string;
  imageUrl: string | null;
  actionUrl: string;
  actionText: string;
  priority: number;
  active: boolean;
  targetAllUsers: boolean;
  targetUserIds: bigint[];
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Serialized ad for API response
 */
export interface SerializedAd {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  action_url: string;
  action_text: string;
  priority: number;
  start_date: string;  // ISO 8601
  end_date: string;    // ISO 8601
}
```

### 7.3 Rate Limit Types

**Module**: Defined in `src/middleware/rateLimit.ts`

```typescript
/**
 * Rate limit configuration options
 */
interface RateLimitOptions {
  windowMs?: number;                      // Time window in milliseconds
  max?: number;                           // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Function to generate rate limit key
  skip?: (req: Request) => boolean;       // Function to skip rate limiting
}

/**
 * Rate limit information for logging
 */
interface RateLimitInfo {
  limit: number;       // Maximum requests allowed
  current: number;     // Current request count
  remaining: number;   // Requests remaining in window
  resetTime: number;   // Unix timestamp when window resets
}
```

### 7.4 Pagination Types

**Module**: `src/middleware/pagination.ts`

Already documented in section 2.2.3

---

## 8. Component Interaction

### 8.1 Request Flow Diagram

```
HTTP Request
    │
    ├─→ CORS Middleware ──────────────────────────────────┐
    │                                                       │
    ├─→ Body Parser ──────────────────────────────────────┤
    │                                                       │
    ├─→ Cache Control ────────────────────────────────────┤
    │                                                       │
    ├─→ Partner Rate Limiter ─────────────────────────────┤
    │   │                                                   │
    │   ├─→ RedisClient.get('rl:partner:45')              │
    │   │   ├─→ If count > 1000: Return 429               │
    │   │   └─→ Else: Increment count                     │
    │   │                                                   │
    │   └─→ Add RateLimit-* headers                       │
    │                                                       │
    ├─→ Request Logger ───────────────────────────────────┤
    │                                                       │
    ├─→ Route Dispatcher ─────────────────────────────────┤
    │                                                       │
    ├─→ Authentication Middleware ────────────────────────┤
    │   │                                                   │
    │   ├─→ JWT Verification                              │
    │   │                                                   │
    │   ├─→ JWTBlacklistService.isTokenBlacklisted()     │
    │   │   └─→ RedisClient.get('blacklist:{token}')     │
    │   │       ├─→ If blacklisted: Return 401           │
    │   │       └─→ Else: Continue                       │
    │   │                                                   │
    │   └─→ Set req.context = { userId, partnerId }      │
    │                                                       │
    ├─→ User Rate Limiter ────────────────────────────────┤
    │   │                                                   │
    │   └─→ RedisClient.get('rl:user:123')               │
    │       ├─→ If count > 100: Return 429               │
    │       └─→ Else: Increment count                    │
    │                                                       │
    ├─→ Pagination Middleware (if list endpoint) ─────────┤
    │   │                                                   │
    │   └─→ Set req.pagination = { page, perPage, ... }  │
    │                                                       │
    ├─→ Controller Handler ───────────────────────────────┤
    │   │                                                   │
    │   ├─→ Validate authorization                        │
    │   │                                                   │
    │   ├─→ Call Service Layer                            │
    │   │   └─→ AdService.getAdsForUser()                │
    │   │       └─→ Prisma.ad.findMany()                 │
    │   │                                                   │
    │   ├─→ Serialize response                            │
    │   │   └─→ paginatedResponse() if paginated         │
    │   │                                                   │
    │   └─→ res.json()                                    │
    │                                                       │
    └─→ Error Handler (if error) ─────────────────────────┘
            │
            └─→ Log error, format response, send
```

### 8.2 Component Dependencies

**Dependency Graph**:

```
┌─────────────────────┐
│   RedisClient       │ (Base)
└──────────┬──────────┘
           │
           ├─→ RateLimitMiddleware
           │   └─→ Uses Redis for distributed limiting
           │
           └─→ JWTBlacklistService
               └─→ Uses Redis for token storage
                   └─→ JWTBlacklistMiddleware
                       └─→ Uses service for validation


┌─────────────────────┐
│ PaginationMiddleware│ (Standalone)
└──────────┬──────────┘
           │
           └─→ Controllers (use req.pagination)


┌─────────────────────┐
│    AdService        │
└──────────┬──────────┘
           │
           └─→ AdsController
               └─→ Uses service for business logic


┌─────────────────────┐
│   Prisma Client     │ (External)
└──────────┬──────────┘
           │
           └─→ AdService
               └─→ All other services
```

### 8.3 Data Flow Patterns

**Pattern 1: Rate Limiting Check**

```
Request → RateLimiter → RedisClient
                ↓
            Get count
                ↓
         Increment count
                ↓
    Set RateLimit-* headers
                ↓
    If exceeded → 429 response
    Else → Continue
```

**Pattern 2: Token Blacklist Check**

```
Request → AuthMiddleware → JWTBlacklistService → RedisClient
                                    ↓
                            Check blacklist
                                    ↓
                    If blacklisted → 401 response
                    Else → Set req.context
```

**Pattern 3: Paginated List**

```
Request → PaginationMiddleware → Controller → Service → Database
              ↓                       ↓          ↓
      req.pagination           Count query   Data query
                                      ↓          ↓
                              totalCount    resources
                                      ↓          ↓
                              paginatedResponse()
                                      ↓
                              { resources, meta }
```

---

## 9. Testing Components

### 9.1 Test Utilities

**Module**: `tests/helpers/testHelpers.ts` (NEW)

```typescript
import { getRedisClient } from '../../src/config/redis';
import { prisma } from '../../src/config/database';

/**
 * Clears all Redis keys for clean test state
 */
export async function clearRedis(): Promise<void> {
  const redis = await getRedisClient();
  if (redis) {
    await redis.flushDb();
  }
}

/**
 * Clears all database tables for clean test state
 */
export async function clearDatabase(): Promise<void> {
  const tables = [
    'Transaction',
    'Account',
    'Budget',
    'Goal',
    'Tag',
    'Alert',
    'Notification',
    'Ad',           // NEW
    'User',
    'Partner'
  ];

  for (const table of tables) {
    const model = table.charAt(0).toLowerCase() + table.slice(1);
    await prisma[model].deleteMany({});
  }
}

/**
 * Creates test partner
 */
export async function createTestPartner(): Promise<bigint> {
  const partner = await prisma.partner.create({
    data: { name: 'Test Partner' }
  });
  return partner.id;
}

/**
 * Creates test user for partner
 */
export async function createTestUser(partnerId: bigint): Promise<bigint> {
  const user = await prisma.user.create({
    data: {
      partnerId,
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User'
    }
  });
  return user.id;
}

/**
 * Generates JWT token for user
 */
export function generateTestToken(userId: string, partnerId: string): string {
  return jwt.sign(
    { userId, partnerId },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  );
}

/**
 * Waits for specified milliseconds (async sleep)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 9.2 Component Test Templates

**Template**: Rate Limit Middleware Test

```typescript
// tests/unit/rateLimit.test.ts
import { createPartnerRateLimiter, createUserRateLimiter } from '../../src/middleware/rateLimit';
import { clearRedis } from '../helpers/testHelpers';
import express from 'express';
import request from 'supertest';

describe('RateLimitMiddleware', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    const partnerLimiter = await createPartnerRateLimiter();
    app.use('/api', partnerLimiter);

    app.get('/api/test', (req, res) => {
      res.json({ success: true });
    });
  });

  beforeEach(async () => {
    await clearRedis();
  });

  describe('Partner Rate Limiter', () => {
    it('should allow requests under limit', async () => {
      const res = await request(app).get('/api/test');

      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBe('1000');
      expect(parseInt(res.headers['ratelimit-remaining'])).toBeLessThanOrEqual(1000);
    });

    it('should return 429 when limit exceeded', async () => {
      // Make 1001 requests
      for (let i = 0; i < 1001; i++) {
        const res = await request(app).get('/api/test');

        if (i < 1000) {
          expect(res.status).toBe(200);
        } else {
          expect(res.status).toBe(429);
          expect(res.body.error).toBe('Rate limit exceeded');
          expect(res.body.retry_after).toBe(3600);
        }
      }
    });

    it('should include rate limit headers', async () => {
      const res = await request(app).get('/api/test');

      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
      expect(res.headers).toHaveProperty('ratelimit-reset');
    });
  });
});
```

**Template**: Pagination Middleware Test

```typescript
// tests/unit/pagination.test.ts
import { paginationMiddleware, createPaginationMeta, paginatedResponse } from '../../src/middleware/pagination';
import express from 'express';
import request from 'supertest';

describe('PaginationMiddleware', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.get('/test', paginationMiddleware, (req, res) => {
      res.json(req.pagination);
    });
  });

  it('should parse pagination parameters', async () => {
    const res = await request(app).get('/test?page=2&per_page=50');

    expect(res.body).toEqual({
      page: 2,
      perPage: 50,
      offset: 50,
      limit: 50
    });
  });

  it('should use defaults for missing parameters', async () => {
    const res = await request(app).get('/test');

    expect(res.body).toEqual({
      page: 1,
      perPage: 25,
      offset: 0,
      limit: 25
    });
  });

  it('should enforce maximum per_page', async () => {
    const res = await request(app).get('/test?per_page=200');

    expect(res.body.perPage).toBe(100);
  });

  it('should enforce minimum page', async () => {
    const res = await request(app).get('/test?page=-1');

    expect(res.body.page).toBe(1);
  });
});

describe('createPaginationMeta', () => {
  it('should create correct metadata', () => {
    const meta = createPaginationMeta(95, { page: 1, perPage: 25, offset: 0, limit: 25 });

    expect(meta).toEqual({
      current_page: 1,
      per_page: 25,
      total_pages: 4,
      total_count: 95
    });
  });

  it('should handle zero results', () => {
    const meta = createPaginationMeta(0, { page: 1, perPage: 25, offset: 0, limit: 25 });

    expect(meta).toEqual({
      current_page: 1,
      per_page: 25,
      total_pages: 0,
      total_count: 0
    });
  });
});
```

**Template**: Ad Service Test

```typescript
// tests/unit/adService.test.ts
import { getAdsForUser } from '../../src/services/adService';
import { prisma } from '../../src/config/database';
import { createTestPartner, createTestUser, clearDatabase } from '../helpers/testHelpers';

describe('AdService', () => {
  let partnerId: bigint;
  let userId: bigint;

  beforeAll(async () => {
    await clearDatabase();
    partnerId = await createTestPartner();
    userId = await createTestUser(partnerId);
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('getAdsForUser', () => {
    it('should return active ads for user', async () => {
      // Create test ad
      await prisma.ad.create({
        data: {
          partnerId,
          title: 'Test Ad',
          description: 'Test Description',
          actionUrl: 'https://example.com',
          actionText: 'Click Here',
          priority: 10,
          active: true,
          targetAllUsers: true,
          startDate: new Date(Date.now() - 86400000), // Yesterday
          endDate: new Date(Date.now() + 86400000)    // Tomorrow
        }
      });

      const ads = await getAdsForUser(userId, partnerId);

      expect(ads).toHaveLength(1);
      expect(ads[0].title).toBe('Test Ad');
    });

    it('should filter by partner', async () => {
      const otherPartnerId = await createTestPartner();

      await prisma.ad.create({
        data: {
          partnerId: otherPartnerId,
          title: 'Other Partner Ad',
          description: 'Test',
          actionUrl: 'https://example.com',
          active: true,
          targetAllUsers: true,
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date(Date.now() + 86400000)
        }
      });

      const ads = await getAdsForUser(userId, partnerId);

      expect(ads.every(ad => ad.partnerId === partnerId)).toBe(true);
    });

    it('should filter by active status', async () => {
      await prisma.ad.create({
        data: {
          partnerId,
          title: 'Inactive Ad',
          description: 'Test',
          actionUrl: 'https://example.com',
          active: false,
          targetAllUsers: true,
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date(Date.now() + 86400000)
        }
      });

      const ads = await getAdsForUser(userId, partnerId);

      expect(ads.every(ad => ad.active === true)).toBe(true);
    });

    it('should filter by date range', async () => {
      // Future ad
      await prisma.ad.create({
        data: {
          partnerId,
          title: 'Future Ad',
          description: 'Test',
          actionUrl: 'https://example.com',
          active: true,
          targetAllUsers: true,
          startDate: new Date(Date.now() + 86400000),  // Tomorrow
          endDate: new Date(Date.now() + 172800000)    // Day after
        }
      });

      // Expired ad
      await prisma.ad.create({
        data: {
          partnerId,
          title: 'Expired Ad',
          description: 'Test',
          actionUrl: 'https://example.com',
          active: true,
          targetAllUsers: true,
          startDate: new Date(Date.now() - 172800000), // 2 days ago
          endDate: new Date(Date.now() - 86400000)     // Yesterday
        }
      });

      const ads = await getAdsForUser(userId, partnerId);

      const now = Date.now();
      expect(ads.every(ad => {
        return ad.startDate.getTime() <= now && ad.endDate.getTime() >= now;
      })).toBe(true);
    });

    it('should order by priority then created date', async () => {
      const ad1 = await prisma.ad.create({
        data: {
          partnerId,
          title: 'Low Priority',
          description: 'Test',
          actionUrl: 'https://example.com',
          priority: 1,
          active: true,
          targetAllUsers: true,
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date(Date.now() + 86400000)
        }
      });

      const ad2 = await prisma.ad.create({
        data: {
          partnerId,
          title: 'High Priority',
          description: 'Test',
          actionUrl: 'https://example.com',
          priority: 10,
          active: true,
          targetAllUsers: true,
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date(Date.now() + 86400000)
        }
      });

      const ads = await getAdsForUser(userId, partnerId);

      expect(ads[0].priority).toBeGreaterThan(ads[1].priority);
    });
  });
});
```

---

## 10. Implementation Checklist

### 10.1 Phase 1: Code Cleanup & Quality

**Dead Code Removal**:
- [ ] Read current `src/routes/stubs.ts`
- [ ] Remove transaction search stub (lines 17-22)
- [ ] Remove budgets stub (lines 24-27)
- [ ] Add documentation comments
- [ ] Test endpoints still work

**Test Stabilization**:
- [ ] Update `tests/setup.ts` with global teardown
- [ ] Add `afterEach` cleanup to all integration tests
- [ ] Update `package.json` test script with `--runInBand`
- [ ] Run all tests and verify 202/202 passing

**Documentation**:
- [ ] Update CLAUDE.md to 98% completion
- [ ] Update feature status table
- [ ] Create release notes

### 10.2 Phase 2: Infrastructure

**Redis Configuration**:
- [ ] Create `src/config/redis.ts`
- [ ] Implement `getRedisClient()`
- [ ] Implement `disconnectRedis()`
- [ ] Add event handlers
- [ ] Test connection and error handling

**Rate Limiting**:
- [ ] Create `src/middleware/rateLimit.ts`
- [ ] Implement `createRateLimiter()` helper
- [ ] Implement `createPartnerRateLimiter()`
- [ ] Implement `createUserRateLimiter()`
- [ ] Update `src/index.ts` to apply middleware
- [ ] Update shutdown handlers
- [ ] Write unit tests

**Pagination**:
- [ ] Create `src/middleware/pagination.ts`
- [ ] Implement `paginationMiddleware`
- [ ] Implement `createPaginationMeta()`
- [ ] Implement `paginatedResponse()`
- [ ] Extend `src/types/express.d.ts`
- [ ] Write unit tests

**Controller Updates**:
- [ ] Update `transactionsController.ts` for pagination
- [ ] Update `transactionService.ts` with count function
- [ ] Update `routes/transactions.ts` with middleware
- [ ] Repeat for 9 other list endpoints
- [ ] Write integration tests

**Dependencies**:
- [ ] Run `npm install express-rate-limit rate-limit-redis redis`
- [ ] Update `package.json`

### 10.3 Phase 3: Optional Features

**JWT Blacklist**:
- [ ] Create `src/middleware/jwtBlacklist.ts`
- [ ] Implement `blacklistToken()`
- [ ] Implement `isTokenBlacklisted()`
- [ ] Update `src/middleware/auth.ts`
- [ ] Implement logout endpoint in `src/routes/users.ts`
- [ ] Remove logout stub
- [ ] Write unit tests
- [ ] Write integration tests

**Ads System**:
- [ ] Update `prisma/schema.prisma` with Ad model
- [ ] Run `npx prisma migrate dev --name add-ads`
- [ ] Create `src/services/adService.ts`
- [ ] Implement `getAdsForUser()`
- [ ] Create `src/controllers/adsController.ts`
- [ ] Implement `getAds()` handler
- [ ] Update `src/utils/serializers.ts` with ad serialization
- [ ] Update `src/routes/users.ts` with ads endpoint
- [ ] Remove ads stub
- [ ] Write unit tests
- [ ] Write integration tests

**Testing**:
- [ ] Create `tests/helpers/testHelpers.ts`
- [ ] Implement test utilities
- [ ] Write rate limit tests
- [ ] Write pagination tests
- [ ] Write JWT blacklist tests
- [ ] Write ad service tests
- [ ] Run full test suite

**Documentation**:
- [ ] Update CLAUDE.md to 100%
- [ ] Document new endpoints
- [ ] Update API specification
- [ ] Create deployment guide

---

**Document Status**: ✅ Ready for Implementation
**Total Components**: 11 (6 new, 5 modified)
**Total Tests Required**: ~30 test cases

---

**End of Component Specification**
