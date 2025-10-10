# API Endpoint Specification: Partner & User Bootstrap Endpoints

## Purpose
This document provides comprehensive layer-by-layer analysis for the two critical bootstrap endpoints required by responsive-tiles frontend at `~/code/banno/responsive-tiles`:

1. `GET /api/v2/partners/current` - Partner configuration and feature flags
2. `GET /api/v2/users/current` - Current user profile and settings

## Analysis Framework

For each endpoint, we analyze five architectural layers:
1. **Database Layer**: Prisma schema (tables, columns, relationships)
2. **Service Layer**: Business logic and data retrieval functions
3. **Serializer Layer**: Response formatting and snake_case conversion
4. **Controller Layer**: Request handling and orchestration
5. **Route Layer**: HTTP endpoint registration

---

# Endpoint 1: GET /api/v2/partners/current

## Overview
Returns partner configuration including branding, feature flags, aggregation settings, and featured financial institution searches.

## Expected Response Structure

```json
{
    "partners": [
        {
            "id": 1,
            "demo": true,
            "domain": "geezeo.geezeo.banno-staging.com",
            "product_name": "My Money Manager",
            "browser_title": "My Money Manager",
            "featured_searches": [
                {
                    "id": 208,
                    "ce_fis": [
                        {
                            "id": 8981,
                            "fi_id": 18442,
                            "name": "KeyBank - Personal",
                            "url": "https://ibx.key.com/ibxolb/login/index.html#/login",
                            "search_name": "keybankpersonal",
                            "enabled": true,
                            "watchlist": false
                        }
                    ],
                    "icon_url": "https://storage.googleapis.com/..."
                }
            ],
            "keepalive_timeout": 15,
            "keepalive_url": "http://google.com",
            "google_tracking_id": "",
            "google_analytics_code": "",
            "webtrends_dcs_id": "",
            "webtrends_domain": "",
            "webtrends_time_zone": "",
            "webtrends_replicate_domain": "",
            "modules": {
                "mobile": {
                    "back_to_online_banking_label": "",
                    "back_to_online_banking_url": "https://www.etsy.com",
                    "classic_dashboard": false,
                    "hide_help_contact_form": false,
                    "hide_logout_link": false,
                    "logout_url": "",
                    "name": "Mobile test",
                    "replace_pfm_name_with_dashboard": false,
                    "version": "v2 Integrated Mobile",
                    "header_style": "Standard",
                    "using_glia": false
                },
                "aggregation": {
                    "type": "finicity",
                    "enabled_on": "2025-21-05"
                }
            },
            "partner_alerts_enabled": true,
            "header_logo": "https://storage.googleapis.com/...",
            "product_logo": "https://storage.googleapis.com/...",
            "institution_logo": "https://storage.googleapis.com/..."
        }
    ]
}
```

## Layer-by-Layer Gap Analysis

### 1. Database Layer (Prisma Schema)

#### Partner Table (Current Status)
**Location**: `prisma/schema.prisma` lines 67-88

**✅ Existing Fields**:
| JSON Field | Database Column | Type | Notes |
|------------|-----------------|------|-------|
| `id` | `id` | BigInt | Primary key |
| `domain` | `domain` | String | Unique constraint |
| `feature_flags` | `featureFlags` | Json | Exists but structure unknown |
| `settings` | `settings` | Json | Exists but structure unknown |
| `logo_url` | `logoUrl` | String? | May map to header_logo |

**❌ Missing Fields** (Need to Add):
| JSON Field | Required Action | Recommended Type | Storage Strategy |
|------------|-----------------|------------------|------------------|
| `demo` | Add column | Boolean | Direct column: `demo Boolean @default(false)` |
| `product_name` | Add column | String? | Direct column: `productName String?` |
| `browser_title` | Add column | String? | Direct column: `browserTitle String?` |
| `keepalive_timeout` | Add to `settings` JSON | Number | JSON path: `settings.keepalive_timeout` |
| `keepalive_url` | Add to `settings` JSON | String | JSON path: `settings.keepalive_url` |
| `google_tracking_id` | Add to `settings` JSON | String | JSON path: `settings.google_tracking_id` |
| `google_analytics_code` | Add to `settings` JSON | String | JSON path: `settings.google_analytics_code` |
| `webtrends_dcs_id` | Add to `settings` JSON | String | JSON path: `settings.webtrends_dcs_id` |
| `webtrends_domain` | Add to `settings` JSON | String | JSON path: `settings.webtrends_domain` |
| `webtrends_time_zone` | Add to `settings` JSON | String | JSON path: `settings.webtrends_time_zone` |
| `webtrends_replicate_domain` | Add to `settings` JSON | String | JSON path: `settings.webtrends_replicate_domain` |
| `modules` | Add to `settings` JSON | Object | JSON path: `settings.modules` |
| `partner_alerts_enabled` | Add column | Boolean | Direct column: `partnerAlertsEnabled Boolean @default(true)` |
| `header_logo` | Add column | String? | Direct column: `headerLogoUrl String?` |
| `product_logo` | Add column | String? | Direct column: `productLogoUrl String?` |
| `institution_logo` | Add column | String? | Direct column: `institutionLogoUrl String?` |

#### FeaturedSearch Table (New Table Needed)
**Status**: ❌ **Does not exist - must create**

```prisma
model FeaturedSearch {
  id          BigInt   @id @default(autoincrement())
  partnerId   BigInt   @map("partner_id")
  iconUrl     String?  @map("icon_url")
  ordering    Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  partner     Partner  @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  ceFis       CeFi[]

  @@map("featured_searches")
}
```

#### CeFi Table (CashEdge Financial Institution - New Table Needed)
**Status**: ❌ **Does not exist - must create**

```prisma
model CeFi {
  id                 BigInt          @id @default(autoincrement())
  featuredSearchId   BigInt          @map("featured_search_id")
  fiId               BigInt          @map("fi_id")
  name               String
  url                String
  searchName         String          @map("search_name")
  enabled            Boolean         @default(true)
  watchlist          Boolean         @default(false)
  createdAt          DateTime        @default(now()) @map("created_at")
  updatedAt          DateTime        @updatedAt @map("updated_at")

  featuredSearch     FeaturedSearch  @relation(fields: [featuredSearchId], references: [id], onDelete: Cascade)

  @@map("ce_fis")
}
```

### 2. Service Layer

#### Current Implementation
**File**: `src/controllers/partnersController.ts` (lines 12-70)
**Status**: ✅ Endpoint exists but needs enhancement

**Existing Logic**:
- ✅ Fetches partner by `partnerId` from JWT context
- ✅ Has hardcoded `modules` configuration
- ✅ Returns serialized response

**❌ Missing Service Functions** (Need to Create):
**File**: `src/services/partnerService.ts` (new file)

```typescript
// Get partner with all related data
export const getPartnerWithConfig = async (partnerId: bigint) => {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: {
      featuredSearches: {
        where: { active: true },
        orderBy: { ordering: 'asc' },
        include: {
          ceFis: {
            where: { enabled: true }
          }
        }
      }
    }
  });
  return partner;
};
```

### 3. Serializer Layer

#### Current Implementation
**File**: `src/utils/serializers.ts`
**Status**: ✅ Generic `serialize()` and `wrapInArray()` exist

**❌ Missing Serializer** (Need to Create):
**Recommendation**: Add `serializePartner()` function

```typescript
export function serializePartner(partner: any): any {
  const settings = partner.settings as any;

  return {
    id: serializeBigInt(partner.id),
    demo: partner.demo || false,
    domain: partner.domain,
    product_name: partner.productName || partner.name,
    browser_title: partner.browserTitle || partner.name,
    featured_searches: partner.featuredSearches?.map(serializeFeaturedSearch) || [],
    keepalive_timeout: settings.keepalive_timeout || 15,
    keepalive_url: settings.keepalive_url || null,
    google_tracking_id: settings.google_tracking_id || "",
    google_analytics_code: settings.google_analytics_code || "",
    webtrends_dcs_id: settings.webtrends_dcs_id || "",
    webtrends_domain: settings.webtrends_domain || "",
    webtrends_time_zone: settings.webtrends_time_zone || "",
    webtrends_replicate_domain: settings.webtrends_replicate_domain || "",
    modules: settings.modules || {
      mobile: { /* defaults */ },
      aggregation: { type: 'finicity' }
    },
    partner_alerts_enabled: partner.partnerAlertsEnabled || true,
    header_logo: partner.headerLogoUrl || null,
    product_logo: partner.productLogoUrl || null,
    institution_logo: partner.institutionLogoUrl || null
  };
}

export function serializeFeaturedSearch(search: any): any {
  return {
    id: serializeBigInt(search.id),
    ce_fis: search.ceFis?.map(serializeCeFi) || [],
    icon_url: search.iconUrl
  };
}

export function serializeCeFi(ceFi: any): any {
  return {
    id: serializeBigInt(ceFi.id),
    fi_id: serializeBigInt(ceFi.fiId),
    name: ceFi.name,
    url: ceFi.url,
    search_name: ceFi.searchName,
    enabled: ceFi.enabled,
    watchlist: ceFi.watchlist
  };
}
```

### 4. Controller Layer

#### Current Implementation
**File**: `src/controllers/partnersController.ts` (getCurrentPartner function)
**Status**: ✅ Exists but needs updates

**Required Changes**:
1. Replace hardcoded config with database-driven config
2. Call new `partnerService.getPartnerWithConfig()`
3. Use new `serializePartner()` function
4. Remove manual field construction

### 5. Route Layer

#### Current Implementation
**File**: `src/routes/partners.ts`
**Status**: ✅ Route exists and registered

```typescript
router.get('/current', authenticateJWT, partnersController.getCurrentPartner);
```

**Status**: ✅ No changes needed (already correct)

---

# Endpoint 2: GET /api/v2/users/current

## Overview
Returns current authenticated user's profile, settings, custom tags, and financial health scores.

## Expected Response Structure

```json
{
    "users": [
        {
            "id": "dpotockitest",
            "custom_tags": [
                "Household",
                "Frogmancometh",
                "Flubbergut.",
                "Boating",
                "Games",
                "Food",
                "Test",
                "Sports"
            ],
            "login": "dpotockitest",
            "email": "donotreply@geezeo.com",
            "login_count": 7589,
            "last_login_at": "2025-10-10T02:54:03.000Z",
            "custom_settings": {
                "financialHealth": {
                    "questions": [
                        100,
                        60,
                        25,
                        75,
                        85,
                        80,
                        50,
                        100
                    ],
                    "scores": {
                        "finHealth": 72,
                        "spend": 80,
                        "save": 50,
                        "borrow": 83,
                        "plan": 75
                    }
                },
                "expenses": {
                    "excluded_tags": [
                        "Transfer",
                        "Bluefin"
                    ]
                }
            },
            "first_name": "beta",
            "last_name": "beta",
            "postal_code": "00000",
            "city": null,
            "state": null,
            "birth_year": 2002,
            "sex": "Female"
        }
    ]
}
```

## Layer-by-Layer Gap Analysis

### 1. Database Layer (Prisma Schema)

#### User Table (Current Status)
**Location**: `prisma/schema.prisma` lines 90-126

**✅ Existing Fields**:
| JSON Field | Database Column | Type | Notes |
|------------|-----------------|------|-------|
| `id` | `id` | BigInt | Primary key |
| `email` | `email` | String? | Exists |
| `first_name` | `firstName` | String? | Exists |
| `last_name` | `lastName` | String? | Exists |
| `login_count` | `loginCount` | Int | Exists |
| `last_login_at` | `lastLoginAt` | DateTime? | Exists |
| `preferences` | `preferences` | Json | Exists but structure unknown |

**❌ Missing Fields** (Need to Add):
| JSON Field | Required Action | Recommended Type | Storage Strategy |
|------------|-----------------|------------------|------------------|
| `login` | Add column | String? | Direct column: `login String? @unique` (username field) |
| `custom_tags` | Add to `preferences` JSON | String[] | JSON path: `preferences.custom_tags` |
| `custom_settings` | Add to `preferences` JSON | Object | JSON path: `preferences.custom_settings` |
| `custom_settings.financialHealth` | Add to `preferences` JSON | Object | JSON path: `preferences.custom_settings.financialHealth` |
| `custom_settings.expenses` | Add to `preferences` JSON | Object | JSON path: `preferences.custom_settings.expenses` |
| `postal_code` | Add column | String? | Direct column: `postalCode String?` |
| `city` | Add column | String? | Direct column: `city String?` |
| `state` | Add column | String? | Direct column: `state String?` (or use enum) |
| `birth_year` | Add column | Int? | Direct column: `birthYear Int?` |
| `sex` | Add column | String? | Direct column: `sex String?` (or use enum: Male/Female/Other/PreferNotToSay) |

**Recommended Schema Updates**:

```prisma
model User {
  // ... existing fields ...
  login              String?   @unique  // Username for login
  postalCode         String?   @map("postal_code")
  city               String?
  state              String?   // Consider: enum for US states
  birthYear          Int?      @map("birth_year")
  sex                String?   // Consider: enum Sex { Male, Female, Other, PreferNotToSay }
  // preferences JSON will store:
  // {
  //   custom_tags: string[],
  //   custom_settings: {
  //     financialHealth: {
  //       questions: number[],
  //       scores: { finHealth, spend, save, borrow, plan }
  //     },
  //     expenses: {
  //       excluded_tags: string[]
  //     }
  //   }
  // }
}
```

### 2. Service Layer

#### Current Implementation
**File**: `src/routes/users.ts` (lines 24-57)
**Status**: ⚠️ Logic in route file, should be in service

**Existing Logic**:
- ✅ Fetches user by `userId` from JWT context
- ✅ Returns basic user fields
- ❌ Missing: custom_tags, custom_settings, demographics

**❌ Missing Service Functions** (Need to Create):
**File**: `src/services/userService.ts` (new file)

```typescript
// Get current user with full profile
export const getCurrentUser = async (userId: bigint) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user;
};

// Update user preferences (custom_tags, custom_settings)
export const updateUserPreferences = async (userId: bigint, preferences: any) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { preferences }
  });
};

// Track login
export const trackLogin = async (userId: bigint) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 }
    }
  });
};
```

### 3. Serializer Layer

#### Current Implementation
**File**: `src/routes/users.ts` (lines 42-52)
**Status**: ⚠️ Using generic `serialize()` - needs custom serializer

**❌ Missing Serializer** (Need to Create):
**File**: `src/utils/serializers.ts`

```typescript
export function serializeUser(user: any): any {
  const preferences = user.preferences as any;

  return {
    id: user.login || user.email || user.id.toString(), // Geezeo uses login as string ID
    custom_tags: preferences?.custom_tags || [],
    login: user.login || user.email,
    email: user.email,
    login_count: user.loginCount || 0,
    last_login_at: user.lastLoginAt ? serializeDate(user.lastLoginAt) : null,
    custom_settings: preferences?.custom_settings || {
      financialHealth: {
        questions: [],
        scores: { finHealth: 0, spend: 0, save: 0, borrow: 0, plan: 0 }
      },
      expenses: {
        excluded_tags: []
      }
    },
    first_name: user.firstName,
    last_name: user.lastName,
    postal_code: user.postalCode,
    city: user.city,
    state: user.state,
    birth_year: user.birthYear,
    sex: user.sex
  };
}
```

### 4. Controller Layer

#### Current Implementation
**File**: `src/routes/users.ts` (lines 24-57)
**Status**: ⚠️ Controller logic mixed in route file

**Required Changes**:
1. **Create** `src/controllers/usersController.ts`
2. **Move** logic from route file to controller
3. **Call** new `userService.getCurrentUser()`
4. **Use** new `serializeUser()` function
5. **Wrap** response with `wrapInArray(user, 'users')`

**New File**: `src/controllers/usersController.ts`

```typescript
import { Request, Response } from 'express';
import { AuthContext } from '../types/auth';
import * as userService from '../services/userService';
import { serializeUser, wrapInArray } from '../utils/serializers';
import { logger } from '../config/logger';

interface AuthenticatedRequest extends Request {
  context?: AuthContext;
}

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq.context!;

    const user = await userService.getCurrentUser(BigInt(userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const serialized = serializeUser(user);
    const wrapped = wrapInArray(serialized, 'users');

    return res.json(wrapped);
  } catch (error) {
    logger.error({ error }, 'Failed to get current user');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

### 5. Route Layer

#### Current Implementation
**File**: `src/routes/users.ts` (line 24)
**Status**: ⚠️ Has inline controller logic

**Required Changes**:
```typescript
// OLD (lines 24-57): Inline logic
router.get('/current', authenticateJWT, async (req: Request, res: Response) => {
  // ... inline controller code ...
});

// NEW (should be):
import * as usersController from '../controllers/usersController';
router.get('/current', authenticateJWT, usersController.getCurrentUser);
```

---

# Reusable Analysis Pattern Template

## Template: Endpoint Layer Analysis Checklist

Use this checklist for any new endpoint analysis:

### 1. Database Layer Checklist
- [ ] List all JSON response fields
- [ ] Map each field to existing database column (if exists)
- [ ] Identify missing columns/tables
- [ ] Determine storage strategy: Direct column vs JSON field vs new table
- [ ] Consider data types, constraints, indexes
- [ ] Design new Prisma models if needed
- [ ] Plan migration strategy

### 2. Service Layer Checklist
- [ ] Identify required data retrieval operations
- [ ] Check for existing service functions
- [ ] Design new service functions for missing operations
- [ ] Consider query optimization (includes, joins, indexes)
- [ ] Plan for business logic (calculations, validations)
- [ ] Consider error handling and edge cases

### 3. Serializer Layer Checklist
- [ ] Check if generic `serialize()` is sufficient
- [ ] Identify complex nested structures requiring custom serialization
- [ ] Design custom serializer functions
- [ ] Handle special types (BigInt, Decimal, Date)
- [ ] Ensure snake_case conversion
- [ ] Plan for null/undefined handling
- [ ] Consider performance for large datasets

### 4. Controller Layer Checklist
- [ ] Check if controller file exists
- [ ] Identify request validation needs
- [ ] Design controller function signature
- [ ] Plan service layer calls
- [ ] Plan serialization and response wrapping
- [ ] Consider error handling and status codes
- [ ] Plan logging strategy

### 5. Route Layer Checklist
- [ ] Verify route path matches specification
- [ ] Confirm HTTP method (GET, POST, PUT, DELETE)
- [ ] Apply authentication middleware
- [ ] Apply validation middleware if needed
- [ ] Wire controller function
- [ ] Verify route is registered in main router

## Implementation Sequence

**Always follow this order**:
1. **Database** → Migrate schema
2. **Service** → Implement data access
3. **Serializer** → Implement response formatting
4. **Controller** → Implement request handling
5. **Route** → Register endpoint
6. **Test** → Verify end-to-end

## Gap Analysis Matrix Template

| Layer | Component | Status | Gap Description | Required Action | Priority |
|-------|-----------|--------|-----------------|----------------|----------|
| Database | Table/Column | ✅/❌ | What's missing | Create/Modify | High/Med/Low |
| Service | Function | ✅/❌ | What's missing | Create/Modify | High/Med/Low |
| Serializer | Function | ✅/❌ | What's missing | Create/Modify | High/Med/Low |
| Controller | Function | ✅/❌ | What's missing | Create/Modify | High/Med/Low |
| Route | Endpoint | ✅/❌ | What's missing | Create/Modify | High/Med/Low |

## Cross-Reference Matrix Template

For tracking which database fields map to which JSON response fields:

| JSON Field Path | Database Source | Service Function | Serializer | Notes |
|----------------|-----------------|------------------|------------|-------|
| `id` | `users.id` | `getCurrentUser()` | `serializeUser()` | BigInt → String |
| `custom_settings.financialHealth` | `users.preferences` JSON | `getCurrentUser()` | `serializeUser()` | Extract from JSON |

---

# Summary of Gaps

## Partners Endpoint Gaps

**High Priority**:
1. Create `FeaturedSearch` table
2. Create `CeFi` table
3. Add partner columns: `demo`, `productName`, `browserTitle`, logo URLs
4. Create `partnerService.ts`
5. Create `serializePartner()` function
6. Update `partnersController.getCurrentPartner()`

**Medium Priority**:
7. Populate `settings` JSON with tracking IDs, webtrends, keepalive
8. Seed featured searches and CE FIs data

## Users Endpoint Gaps

**High Priority**:
1. Add user columns: `login`, demographics (`postalCode`, `city`, `state`, `birthYear`, `sex`)
2. Define `preferences` JSON structure (custom_tags, custom_settings)
3. Create `userService.ts`
4. Create `serializeUser()` function
5. Create `usersController.ts`
6. Refactor `users.ts` route to use controller

**Medium Priority**:
7. Implement financial health score calculation logic
8. Implement expenses excluded tags integration

---

# Next Steps

1. **Review and Approve** this specification
2. **Prioritize** implementation order
3. **Create** database migration for schema changes
4. **Implement** services, serializers, controllers
5. **Test** endpoints against responsive-tiles frontend
6. **Document** any deviations or additional requirements discovered
