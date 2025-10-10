# API Specification: Final 5% Features

**Document Version**: 1.0
**API Version**: 2.0.0
**Date**: 2025-10-04
**Status**: Design Specification
**Base URL**: `https://api.example.com/api/v2`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Infrastructure Enhancements](#2-infrastructure-enhancements)
3. [Rate Limiting](#3-rate-limiting)
4. [Pagination](#4-pagination)
5. [Authentication Enhancements](#5-authentication-enhancements)
6. [Ads API](#6-ads-api)
7. [Health & Monitoring](#7-health--monitoring)
8. [Error Responses](#8-error-responses)
9. [Migration Guide](#9-migration-guide)
10. [Examples](#10-examples)

---

## 1. Overview

### 1.1 Purpose

This specification documents the **new and enhanced API features** required to complete the final 5% of the PFM Backend Simulator. These enhancements focus on:

- **Infrastructure**: Rate limiting and pagination
- **Security**: JWT logout and token blacklist
- **Features**: Ads system
- **Quality**: API specification compliance

### 1.2 Scope

**Phase 1 (No API Changes)**:
- Code cleanup (removes dead stub endpoints)
- Test stabilization (no API impact)

**Phase 2 (New Infrastructure)**:
- Rate limiting headers on all endpoints
- Pagination support for list endpoints

**Phase 3 (New Features - Optional)**:
- JWT logout endpoint
- Ads endpoints

### 1.3 Backward Compatibility

**All enhancements are backward compatible**:
- ✅ Existing clients continue to work without changes
- ✅ New headers are additive (do not break parsing)
- ✅ Pagination is optional (defaults maintain current behavior)
- ✅ New endpoints do not conflict with existing routes

### 1.4 Standards & Conventions

**HTTP Methods**:
- `GET`: Retrieve resources (idempotent, cacheable)
- `POST`: Create resources (non-idempotent)
- `PUT`: Update resources (idempotent)
- `DELETE`: Delete resources (idempotent)

**Response Format**:
```json
{
  "resource_name": { /* single resource */ },
  // OR
  "resource_name_plural": [ /* array of resources */ ],
  "meta": { /* pagination, counts, etc. */ }
}
```

**Timestamp Format**: ISO 8601 with UTC timezone
```
2025-10-04T14:30:00.000Z
```

**Currency Format**: String with 2 decimal places
```json
{
  "amount": "1234.56",
  "balance": "-45.67"
}
```

---

## 2. Infrastructure Enhancements

### 2.1 HTTP Headers (All Endpoints)

**Request Headers**:
```
Authorization: Bearer {jwt_token}       # Required for authenticated endpoints
Content-Type: application/json          # Required for POST/PUT requests
Accept: application/json                # Optional, defaults to application/json
```

**Response Headers** (Phase 2 - New):
```
Content-Type: application/json
Cache-Control: no-store, no-cache, must-revalidate, private
RateLimit-Limit: 100                    # 🆕 Max requests in window
RateLimit-Remaining: 95                 # 🆕 Remaining requests
RateLimit-Reset: 1696435200             # 🆕 Window reset time (Unix timestamp)
```

**Legacy Headers** (Not Used):
```
X-RateLimit-Limit: 100                  # Deprecated (use RateLimit-Limit)
X-RateLimit-Remaining: 95               # Deprecated (use RateLimit-Remaining)
X-RateLimit-Reset: 1696435200           # Deprecated (use RateLimit-Reset)
```

### 2.2 Response Status Codes

**Success Codes**:
- `200 OK`: Successful GET, PUT, DELETE
- `201 Created`: Successful POST (resource created)
- `204 No Content`: Successful DELETE or action with no response body

**Client Error Codes**:
- `400 Bad Request`: Invalid request format or parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Valid auth but insufficient permissions
- `404 Not Found`: Resource does not exist
- `409 Conflict`: Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded (🆕 Phase 2)

**Server Error Codes**:
- `500 Internal Server Error`: Unexpected server error
- `502 Bad Gateway`: Upstream service failure
- `503 Service Unavailable`: Temporary maintenance or overload

---

## 3. Rate Limiting

### 3.1 Rate Limit Tiers

**Partner-Level Rate Limit**:
- **Limit**: 1000 requests per hour
- **Scope**: All requests from a partner's users
- **Key**: `partnerId` (from JWT)
- **Applied**: Before authentication
- **Purpose**: Prevent partner-level abuse

**User-Level Rate Limit**:
- **Limit**: 100 requests per 15 minutes
- **Scope**: Individual user requests
- **Key**: `userId` (from JWT)
- **Applied**: After authentication
- **Purpose**: Prevent individual user abuse

### 3.2 Rate Limit Headers

**All Responses Include** (Phase 2):

```http
HTTP/1.1 200 OK
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1696435200
Content-Type: application/json

{
  "accounts": [...]
}
```

**Header Details**:

| Header | Type | Description |
|--------|------|-------------|
| `RateLimit-Limit` | integer | Maximum requests allowed in current window |
| `RateLimit-Remaining` | integer | Requests remaining in current window (0-100) |
| `RateLimit-Reset` | integer | Unix timestamp when window resets |

**Calculating Time Until Reset**:
```javascript
const resetTime = parseInt(headers['ratelimit-reset']);
const now = Math.floor(Date.now() / 1000);
const secondsUntilReset = resetTime - now;
```

### 3.3 Rate Limit Exceeded Response

**HTTP 429 Response**:

```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1696435200
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "retry_after": 300
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `error` | string | Error message: "Rate limit exceeded" |
| `retry_after` | integer | Seconds until rate limit window resets |

**Client Handling**:
```javascript
if (response.status === 429) {
  const retryAfter = response.data.retry_after;
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  // Wait and retry, or show user message
}
```

### 3.4 Rate Limit Exemptions

**Exempt Endpoints**:
- `GET /health` - Health check endpoint
- Static asset routes (migration UI)

**Reduced Limits** (Future):
- Batch operations may have stricter limits
- Export/report generation may have daily limits

---

## 4. Pagination

### 4.1 Query Parameters

**All List Endpoints Support** (Phase 2):

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number (1-indexed) |
| `per_page` | integer | 25 | 100 | Items per page |

**Examples**:
```
GET /api/v2/users/123/transactions/search?page=1&per_page=25
GET /api/v2/users/123/accounts/all?page=2&per_page=50
GET /api/v2/users/123/budgets?per_page=10
```

### 4.2 Paginated Response Format

**Structure**:

```json
{
  "resources": [
    { "id": 1, "name": "..." },
    { "id": 2, "name": "..." }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total_pages": 4,
    "total_count": 95
  }
}
```

**Meta Object Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `current_page` | integer | Current page number (1-indexed) |
| `per_page` | integer | Items per page for this request |
| `total_pages` | integer | Total number of pages available |
| `total_count` | integer | Total number of items across all pages |

### 4.3 Endpoints with Pagination

**Supported Endpoints** (Phase 2):

| Endpoint | Resource Key | Default Sort |
|----------|--------------|--------------|
| `GET /users/:userId/transactions/search` | `transactions` | `posted_at DESC` |
| `GET /users/:userId/accounts/all` | `accounts` | `ordering ASC, created_at DESC` |
| `GET /users/:userId/budgets` | `budgets` | `created_at DESC` |
| `GET /users/:userId/goals/savings_goals` | `savings_goals` | `created_at DESC` |
| `GET /users/:userId/goals/payoff_goals` | `payoff_goals` | `created_at DESC` |
| `GET /users/:userId/tags` | `tags` | `name ASC` |
| `GET /users/:userId/alerts` | `alerts` | `created_at DESC` |
| `GET /users/:userId/cashflow/bills` | `bills` | `next_due_date ASC` |
| `GET /users/:userId/cashflow/incomes` | `incomes` | `next_due_date ASC` |
| `GET /users/:userId/cashflow/events` | `events` | `due_date ASC` |

### 4.4 Pagination Examples

**Example 1: First Page**

```http
GET /api/v2/users/123/transactions/search?q=coffee&page=1&per_page=10
Authorization: Bearer {token}
```

**Response**:
```json
{
  "transactions": [
    {
      "id": 1001,
      "description": "Starbucks",
      "amount": "-5.50",
      "posted_at": "2025-10-04T08:00:00.000Z"
    },
    {
      "id": 1002,
      "description": "Coffee Bean",
      "amount": "-4.25",
      "posted_at": "2025-10-03T09:15:00.000Z"
    }
    // ... 8 more items
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total_pages": 3,
    "total_count": 27
  }
}
```

**Example 2: Last Page**

```http
GET /api/v2/users/123/transactions/search?q=coffee&page=3&per_page=10
```

**Response**:
```json
{
  "transactions": [
    // ... 7 items (partial page)
  ],
  "meta": {
    "current_page": 3,
    "per_page": 10,
    "total_pages": 3,
    "total_count": 27
  }
}
```

**Example 3: No Results**

```http
GET /api/v2/users/123/transactions/search?q=nonexistent&page=1&per_page=10
```

**Response**:
```json
{
  "transactions": [],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total_pages": 0,
    "total_count": 0
  }
}
```

### 4.5 Client Implementation

**Building Pagination UI**:

```javascript
function renderPagination(meta) {
  const { current_page, total_pages } = meta;

  return {
    hasPrevious: current_page > 1,
    hasNext: current_page < total_pages,
    previousPage: current_page - 1,
    nextPage: current_page + 1,
    pages: Array.from({ length: total_pages }, (_, i) => i + 1)
  };
}
```

**Fetching Next Page**:

```javascript
async function fetchNextPage(currentMeta, baseUrl) {
  if (currentMeta.current_page >= currentMeta.total_pages) {
    return null; // No more pages
  }

  const nextPage = currentMeta.current_page + 1;
  const url = `${baseUrl}?page=${nextPage}&per_page=${currentMeta.per_page}`;

  return await fetch(url);
}
```

---

## 5. Authentication Enhancements

### 5.1 Logout Endpoint (Phase 3)

**Endpoint**: `POST /api/v2/users/:userId/logout`

**Purpose**: Invalidate JWT token server-side to prevent reuse

**Request**:
```http
POST /api/v2/users/123/logout HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Length: 0
```

**Success Response (204)**:
```http
HTTP/1.1 204 No Content
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1696435200
```

**Error Response (401)**: Invalid or expired token
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Invalid token"
}
```

**Error Response (403)**: User trying to logout another user
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "Forbidden"
}
```

**Behavior**:
1. Extract JWT from `Authorization` header
2. Add token to Redis blacklist with TTL = token expiration time
3. Return 204 No Content
4. Subsequent requests with same token return 401

**Client Flow**:
```javascript
// 1. Call logout endpoint
await fetch('/api/v2/users/123/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 2. Clear local token storage
localStorage.removeItem('jwt_token');

// 3. Redirect to login
window.location.href = '/login';
```

### 5.2 Token Blacklist Behavior

**After Logout**:

```http
GET /api/v2/users/123/accounts/all
Authorization: Bearer {blacklisted_token}
```

**Response (401)**:
```json
{
  "error": "Token has been revoked"
}
```

**Blacklist Expiration**:
- Tokens automatically removed from blacklist after JWT expiration
- TTL = `token.exp - current_time`
- No manual cleanup required

**Performance**:
- Redis lookup adds ~1-5ms per request
- Fail-open if Redis unavailable (maintains availability)

---

## 6. Ads API

### 6.1 Get User Ads (Phase 3)

**Endpoint**: `GET /api/v2/users/:userId/ads`

**Purpose**: Retrieve promotional content targeted to the user

**Request**:
```http
GET /api/v2/users/123/ads HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
```

**Success Response (200)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1696435200

{
  "ads": [
    {
      "id": 1001,
      "title": "Discover Our New Savings Account",
      "description": "Earn 4.5% APY with no minimum balance. FDIC insured up to $250,000.",
      "image_url": "https://cdn.example.com/ads/savings-account.jpg",
      "action_url": "https://example.com/products/savings",
      "action_text": "Learn More",
      "priority": 10,
      "start_date": "2025-10-01T00:00:00.000Z",
      "end_date": "2025-12-31T23:59:59.999Z"
    },
    {
      "id": 1002,
      "title": "Credit Card Rewards Program",
      "description": "Get 2% cash back on all purchases. No annual fee.",
      "image_url": "https://cdn.example.com/ads/credit-card.jpg",
      "action_url": "https://example.com/products/credit-cards",
      "action_text": "Apply Now",
      "priority": 5,
      "start_date": "2025-09-15T00:00:00.000Z",
      "end_date": "2025-11-30T23:59:59.999Z"
    }
  ]
}
```

**Response Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Ad unique identifier |
| `title` | string | Yes | Ad headline (max 255 chars) |
| `description` | string | Yes | Ad body text |
| `image_url` | string | No | URL to ad image/banner |
| `action_url` | string | Yes | Target URL when user clicks |
| `action_text` | string | Yes | Call-to-action text (default: "Learn More") |
| `priority` | integer | Yes | Display priority (higher = shown first) |
| `start_date` | string | Yes | ISO 8601 timestamp when ad becomes active |
| `end_date` | string | Yes | ISO 8601 timestamp when ad expires |

**Empty Response** (No active ads):
```json
{
  "ads": []
}
```

**Ordering**:
- Ads sorted by `priority DESC, created_at DESC`
- Higher priority ads shown first
- Recently created ads prioritized within same priority level

**Filtering Logic**:
1. Ad must be active (`active = true`)
2. Current time must be between `start_date` and `end_date`
3. Ad must target either:
   - All users (`target_all_users = true`), OR
   - Specific user (`userId` in `target_user_ids` array)
4. Ad must belong to user's partner (`partnerId` matches)

### 6.2 Ad Click Tracking (Future)

**Endpoint**: `POST /api/v2/users/:userId/ads/:adId/click` (Not in Phase 3)

**Purpose**: Track ad engagement for analytics

---

## 7. Health & Monitoring

### 7.1 Health Check Endpoint

**Endpoint**: `GET /health`

**Purpose**: Monitor service availability

**Request**:
```http
GET /health HTTP/1.1
Host: api.example.com
```

**Success Response (200)** - Phase 1:
```json
{
  "status": "ok",
  "timestamp": "2025-10-04T14:30:00.000Z"
}
```

**Enhanced Response (200)** - Phase 2:
```json
{
  "status": "ok",
  "timestamp": "2025-10-04T14:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

**Degraded Response (200)** - Redis unavailable:
```json
{
  "status": "ok",
  "timestamp": "2025-10-04T14:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "disconnected"
  }
}
```

**Service Unavailable (503)** - Database down:
```json
{
  "status": "unavailable",
  "timestamp": "2025-10-04T14:30:00.000Z",
  "services": {
    "database": "disconnected",
    "redis": "connected"
  }
}
```

**Response Codes**:
- `200 OK`: Core services operational (database connected)
- `503 Service Unavailable`: Core services down (database disconnected)

**Monitoring**:
- Call `/health` every 30 seconds
- Alert if 3 consecutive 503 responses
- Check `services.redis` for cache availability

---

## 8. Error Responses

### 8.1 Standard Error Format

**All errors follow this structure**:

```json
{
  "error": "Error message",
  "details": {
    "field": "validation_error"
  }
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error` | string | Yes | Human-readable error message |
| `details` | object | No | Additional error context (validation errors, stack traces in dev) |

### 8.2 Error Catalog

**400 Bad Request**:
```json
{
  "error": "Invalid request parameters",
  "details": {
    "per_page": "must be between 1 and 100"
  }
}
```

**401 Unauthorized**:
```json
{
  "error": "Invalid token"
}
```

**401 Unauthorized** (Blacklisted token - Phase 3):
```json
{
  "error": "Token has been revoked"
}
```

**403 Forbidden**:
```json
{
  "error": "Forbidden"
}
```

**404 Not Found**:
```json
{
  "error": "Resource not found"
}
```

**429 Too Many Requests** (Phase 2):
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 300
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error"
}
```

**500 Internal Server Error** (Development only):
```json
{
  "error": "Internal server error",
  "details": {
    "message": "Cannot read property 'id' of undefined",
    "stack": "Error: Cannot read property...\n  at Controller..."
  }
}
```

### 8.3 Error Handling Best Practices

**Client Implementation**:

```javascript
async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options);

    // Handle rate limiting
    if (response.status === 429) {
      const data = await response.json();
      await sleep(data.retry_after * 1000);
      return makeRequest(url, options); // Retry
    }

    // Handle authentication errors
    if (response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
      return;
    }

    // Handle other errors
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return await response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

---

## 9. Migration Guide

### 9.1 Phase 1: No API Changes

**Impact**: None - internal code cleanup only

**Action Required**: None

### 9.2 Phase 2: Rate Limiting & Pagination

**Impact**: New response headers, optional pagination

**Changes**:

**Before (Phase 1)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "transactions": [...]
}
```

**After (Phase 2)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1696435200

{
  "transactions": [...],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total_pages": 4,
    "total_count": 95
  }
}
```

**Client Updates**:

1. **Read Rate Limit Headers** (Optional but recommended):
```javascript
const limit = response.headers.get('RateLimit-Limit');
const remaining = response.headers.get('RateLimit-Remaining');
const reset = response.headers.get('RateLimit-Reset');

if (remaining < 10) {
  console.warn('Approaching rate limit');
}
```

2. **Handle 429 Responses**:
```javascript
if (response.status === 429) {
  const data = await response.json();
  const retryAfter = data.retry_after;
  // Wait and retry
}
```

3. **Use Pagination** (Optional):
```javascript
// Old way (still works)
const response = await fetch('/api/v2/users/123/transactions/search?q=coffee');

// New way (with pagination)
const response = await fetch('/api/v2/users/123/transactions/search?q=coffee&page=1&per_page=50');

// Access pagination metadata
const { transactions, meta } = await response.json();
console.log(`Showing ${meta.current_page} of ${meta.total_pages} pages`);
```

**Backward Compatibility**:
- ✅ Requests without `page`/`per_page` default to `page=1&per_page=25`
- ✅ Response structure unchanged (meta is additive)
- ✅ Existing clients continue to work

### 9.3 Phase 3: Logout & Ads (Optional)

**Impact**: New endpoints available

**Changes**:

**1. Implement Logout Flow**:

```javascript
// Add logout function
async function logout() {
  const token = localStorage.getItem('jwt_token');
  const userId = parseJWT(token).userId;

  try {
    await fetch(`/api/v2/users/${userId}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    // Continue with client-side logout even if server call fails
  }

  // Clear token and redirect
  localStorage.removeItem('jwt_token');
  window.location.href = '/login';
}
```

**2. Display Ads** (if enabled):

```javascript
async function loadAds(userId) {
  const response = await fetch(`/api/v2/users/${userId}/ads`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const { ads } = await response.json();

  // Render ads in UI
  ads.forEach(ad => {
    renderAd(ad);
  });
}

function renderAd(ad) {
  return `
    <div class="ad">
      <img src="${ad.image_url}" alt="${ad.title}" />
      <h3>${ad.title}</h3>
      <p>${ad.description}</p>
      <a href="${ad.action_url}" target="_blank">${ad.action_text}</a>
    </div>
  `;
}
```

**Backward Compatibility**:
- ✅ New endpoints do not conflict with existing routes
- ✅ Clients can ignore ads if not displaying them
- ✅ Logout is optional (client-side logout still works)

---

## 10. Examples

### 10.1 Complete Request/Response Examples

#### Example 1: Transaction Search with Pagination

**Request**:
```http
GET /api/v2/users/123/transactions/search?q=grocery&start_date=2025-09-01&end_date=2025-09-30&page=1&per_page=10 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJwYXJ0bmVySWQiOiI0NSIsImlhdCI6MTY5NjQzNTIwMCwiZXhwIjoxNjk2NTIxNjAwfQ.signature
Accept: application/json
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1696435800
Cache-Control: no-store, no-cache, must-revalidate, private

{
  "transactions": [
    {
      "id": 5001,
      "description": "Whole Foods Market",
      "merchant_name": "Whole Foods",
      "amount": "-85.42",
      "posted_at": "2025-09-28T10:30:00.000Z",
      "account_id": 1001,
      "primary_tag_id": 50,
      "transaction_type": "debit"
    },
    {
      "id": 5002,
      "description": "Trader Joe's",
      "merchant_name": "Trader Joe's",
      "amount": "-62.18",
      "posted_at": "2025-09-25T14:15:00.000Z",
      "account_id": 1001,
      "primary_tag_id": 50,
      "transaction_type": "debit"
    },
    {
      "id": 5003,
      "description": "Safeway",
      "merchant_name": "Safeway",
      "amount": "-43.99",
      "posted_at": "2025-09-22T09:00:00.000Z",
      "account_id": 1001,
      "primary_tag_id": 50,
      "transaction_type": "debit"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total_pages": 2,
    "total_count": 15
  }
}
```

#### Example 2: Rate Limit Exceeded

**Request** (101st request in 15-minute window):
```http
GET /api/v2/users/123/accounts/all HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
```

**Response**:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1696435800

{
  "error": "Rate limit exceeded",
  "retry_after": 600
}
```

#### Example 3: Logout Flow

**Step 1: Logout Request**:
```http
POST /api/v2/users/123/logout HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Length: 0
```

**Step 1 Response**:
```http
HTTP/1.1 204 No Content
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1696435800
```

**Step 2: Attempt to use same token**:
```http
GET /api/v2/users/123/accounts/all HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 2 Response** (Token blacklisted):
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Token has been revoked"
}
```

#### Example 4: Ads Retrieval

**Request**:
```http
GET /api/v2/users/123/ads HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1696435800

{
  "ads": [
    {
      "id": 2001,
      "title": "Switch to Paperless Statements",
      "description": "Go green and earn bonus points! Switch to paperless statements today and get 500 bonus rewards points.",
      "image_url": "https://cdn.example.com/ads/paperless.jpg",
      "action_url": "https://example.com/settings/statements",
      "action_text": "Go Paperless",
      "priority": 8,
      "start_date": "2025-10-01T00:00:00.000Z",
      "end_date": "2025-10-31T23:59:59.999Z"
    },
    {
      "id": 2002,
      "title": "Refer a Friend Program",
      "description": "Give $50, get $50. Refer friends and you both get rewarded!",
      "image_url": "https://cdn.example.com/ads/referral.jpg",
      "action_url": "https://example.com/referrals",
      "action_text": "Refer Now",
      "priority": 5,
      "start_date": "2025-09-15T00:00:00.000Z",
      "end_date": "2025-12-31T23:59:59.999Z"
    }
  ]
}
```

### 10.2 cURL Examples

**Transaction Search with Pagination**:
```bash
curl -X GET \
  'https://api.example.com/api/v2/users/123/transactions/search?q=coffee&page=1&per_page=10' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Accept: application/json'
```

**Logout**:
```bash
curl -X POST \
  'https://api.example.com/api/v2/users/123/logout' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Get Ads**:
```bash
curl -X GET \
  'https://api.example.com/api/v2/users/123/ads' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Accept: application/json'
```

**Health Check**:
```bash
curl -X GET 'https://api.example.com/health'
```

### 10.3 JavaScript SDK Examples

**Rate Limit Aware Client**:

```javascript
class APIClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
    this.rateLimit = {
      limit: null,
      remaining: null,
      reset: null
    };
  }

  async request(endpoint, options = {}) {
    // Check if we're about to hit rate limit
    if (this.rateLimit.remaining !== null && this.rateLimit.remaining < 5) {
      const now = Math.floor(Date.now() / 1000);
      if (now < this.rateLimit.reset) {
        const wait = this.rateLimit.reset - now;
        console.warn(`Approaching rate limit, waiting ${wait}s`);
        await sleep(wait * 1000);
      }
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Update rate limit info
    this.rateLimit.limit = parseInt(response.headers.get('RateLimit-Limit'));
    this.rateLimit.remaining = parseInt(response.headers.get('RateLimit-Remaining'));
    this.rateLimit.reset = parseInt(response.headers.get('RateLimit-Reset'));

    // Handle rate limiting
    if (response.status === 429) {
      const data = await response.json();
      await sleep(data.retry_after * 1000);
      return this.request(endpoint, options); // Retry
    }

    // Handle auth errors
    if (response.status === 401) {
      throw new AuthError('Authentication failed');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.error, response.status);
    }

    return await response.json();
  }

  async logout(userId) {
    await this.request(`/api/v2/users/${userId}/logout`, {
      method: 'POST'
    });
    this.token = null;
  }
}

// Usage
const client = new APIClient('https://api.example.com', token);

try {
  const data = await client.request('/api/v2/users/123/accounts/all');
  console.log('Accounts:', data.accounts);
  console.log('Rate limit remaining:', client.rateLimit.remaining);
} catch (error) {
  console.error('API Error:', error);
}
```

**Pagination Helper**:

```javascript
class PaginatedRequest {
  constructor(client, endpoint) {
    this.client = client;
    this.endpoint = endpoint;
    this.currentPage = 1;
    this.perPage = 25;
  }

  async fetch(page = this.currentPage) {
    const url = `${this.endpoint}?page=${page}&per_page=${this.perPage}`;
    const response = await this.client.request(url);
    this.currentPage = response.meta.current_page;
    return response;
  }

  async next() {
    return this.fetch(this.currentPage + 1);
  }

  async previous() {
    if (this.currentPage > 1) {
      return this.fetch(this.currentPage - 1);
    }
    return null;
  }

  async* items() {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.fetch(page);
      const resourceKey = Object.keys(response).find(k => k !== 'meta');

      for (const item of response[resourceKey]) {
        yield item;
      }

      hasMore = response.meta.current_page < response.meta.total_pages;
      page++;
    }
  }
}

// Usage: Iterate all transactions
const paginated = new PaginatedRequest(
  client,
  '/api/v2/users/123/transactions/search?q=coffee'
);

for await (const transaction of paginated.items()) {
  console.log(transaction.description, transaction.amount);
}
```

---

## Appendix A: Endpoint Summary

### New Endpoints (Phase 3)

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/v2/users/:userId/logout` | Invalidate JWT token | Yes |
| GET | `/api/v2/users/:userId/ads` | Get targeted ads | Yes |

### Modified Endpoints (Phase 2)

All list endpoints now support pagination via `?page=X&per_page=Y`:

- `GET /api/v2/users/:userId/transactions/search`
- `GET /api/v2/users/:userId/accounts/all`
- `GET /api/v2/users/:userId/budgets`
- `GET /api/v2/users/:userId/goals/savings_goals`
- `GET /api/v2/users/:userId/goals/payoff_goals`
- `GET /api/v2/users/:userId/tags`
- `GET /api/v2/users/:userId/alerts`
- `GET /api/v2/users/:userId/cashflow/bills`
- `GET /api/v2/users/:userId/cashflow/incomes`
- `GET /api/v2/users/:userId/cashflow/events`

### All Endpoints (Phase 2)

All endpoints now include rate limit headers in responses.

---

## Appendix B: HTTP Status Code Reference

| Code | Name | When to Use |
|------|------|-------------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE or logout |
| 400 | Bad Request | Invalid parameters or request format |
| 401 | Unauthorized | Missing, invalid, or revoked token |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded (Phase 2) |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Service temporarily down |

---

## Appendix C: Rate Limit Calculations

**Partner Rate Limit**:
- Window: 1 hour (3600 seconds)
- Limit: 1000 requests
- Average rate: ~16.67 requests/minute
- Burst tolerance: Can use all 1000 in first minute if needed

**User Rate Limit**:
- Window: 15 minutes (900 seconds)
- Limit: 100 requests
- Average rate: ~6.67 requests/minute
- Burst tolerance: Can use all 100 in first minute if needed

**Combined Effect**:
- Single user cannot exceed 100 req/15min
- All partner users combined cannot exceed 1000 req/hour
- If partner has 20 active users, average ~50 req/hour/user

**Example Scenario**:
- Partner limit: 1000/hour
- Partner has 10 users
- Each user can do 100/15min (400/hour theoretical)
- But collectively limited to 1000/hour
- Practical limit per user: ~100/hour when all active

---

## Appendix D: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-04 | Initial specification for final 5% features |

---

**Document Status**: ✅ Ready for Review
**Approval Status**: Pending
**Next Review**: After Phase 1 completion

---

**End of API Specification**
