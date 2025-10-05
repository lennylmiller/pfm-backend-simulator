# Database Specification - Final 5% Implementation

**Document Version**: 1.0
**Generated**: 2025-10-04
**Target Implementation**: Phase 2 (Rate Limiting) + Phase 3 (Ads System)
**Database**: PostgreSQL 14+
**ORM**: Prisma 5.x

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Changes Summary](#schema-changes-summary)
3. [Phase 2: Infrastructure Tables](#phase-2-infrastructure-tables)
4. [Phase 3: Ad System Tables](#phase-3-ad-system-tables)
5. [Migration Strategy](#migration-strategy)
6. [Data Dictionary](#data-dictionary)
7. [Indexing Strategy](#indexing-strategy)
8. [Performance Considerations](#performance-considerations)
9. [Security Considerations](#security-considerations)
10. [Rollback Procedures](#rollback-procedures)

---

## Overview

### Purpose

This specification defines the database schema changes required to complete the final 5% of the PFM Backend Simulator, focusing on:

- **Phase 2**: No database changes (rate limiting uses Redis, pagination is application-level)
- **Phase 3**: New `Ad` model for marketing content delivery system

### Current Database State

**Existing Tables** (21 total):
- Core: `partners`, `users`, `oauth_clients`, `access_tokens`
- Financial: `accounts`, `transactions`, `budgets`, `goals`
- Organization: `tags`, `transaction_tags` (join table)
- Alerts: `alerts`, `notifications`
- Cashflow: `cashflow_bills`, `cashflow_incomes`, `cashflow_events`

**Total Records** (Development):
- ~500 test records across all tables
- Seeded with realistic data via Faker.js

### Schema Design Principles

1. **Consistency**: Follow existing naming conventions (snake_case for columns)
2. **Precision**: Use BigInt for IDs, Decimal for currency
3. **Auditability**: Include createdAt, updatedAt timestamps
4. **Soft Deletes**: Use deletedAt for reversible operations
5. **Multi-Tenancy**: Scope data by partnerId where applicable
6. **Performance**: Strategic indexing for query patterns

---

## Schema Changes Summary

| Change Type | Table | Phase | Migration Complexity | Risk Level |
|------------|-------|-------|---------------------|------------|
| **New Table** | `ads` | Phase 3 | Low | Low |
| **New Index** | `ads` (partnerId, active, startDate) | Phase 3 | Low | Low |
| **New Index** | `ads` (targetUserIds - GIN) | Phase 3 | Low | Low |

**Total New Tables**: 1
**Total New Indexes**: 2
**Total New Columns**: 0 (no modifications to existing tables)

**Estimated Migration Time**:
- Development: 2 minutes
- Production: 5 minutes (depends on ad volume, expected <1000 rows)

---

## Phase 2: Infrastructure Tables

### Summary

**No database changes required for Phase 2.**

**Rationale**:

1. **Rate Limiting**:
   - Implementation: Redis-backed in-memory store
   - No persistent storage needed (rate limit windows are ephemeral)
   - Avoids database query overhead for high-frequency rate checks

2. **Pagination**:
   - Implementation: Application-level query modification (LIMIT/OFFSET)
   - No schema changes needed
   - Uses existing indexes on createdAt, id for efficient pagination

**Redis Schema** (for reference, not part of Prisma):

```redis
# Rate Limiting Keys (TTL: 15 minutes - 1 hour)
rl:user:{userId}         -> "requests_count"  (EX 900)
rl:partner:{partnerId}   -> "requests_count"  (EX 3600)

# JWT Blacklist Keys (TTL: token expiration time)
blacklist:{jti}          -> "1"  (EX remaining_ttl)
```

---

## Phase 3: Ad System Tables

### Table: `ads`

**Purpose**: Store promotional marketing content targeted at users

**Cardinality**: Low (expected <1000 rows per partner)

**Prisma Model**:

```prisma
model Ad {
  id              BigInt    @id @default(autoincrement())
  partnerId       BigInt    @map("partner_id")
  title           String    @db.VarChar(200)
  description     String?   @db.Text
  imageUrl        String?   @map("image_url") @db.VarChar(500)
  actionUrl       String?   @map("action_url") @db.VarChar(500)
  actionText      String?   @map("action_text") @db.VarChar(100)
  priority        Int       @default(0)
  active          Boolean   @default(true)
  startDate       DateTime  @map("start_date")
  endDate         DateTime  @map("end_date")
  targetAllUsers  Boolean   @default(true) @map("target_all_users")
  targetUserIds   BigInt[]  @map("target_user_ids")
  impressions     Int       @default(0)
  clicks          Int       @default(0)
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  partner         Partner   @relation(fields: [partnerId], references: [id], onDelete: Cascade)

  @@index([partnerId, active, startDate, endDate])
  @@index([targetUserIds], type: Gin)
  @@map("ads")
}
```

**SQL DDL**:

```sql
CREATE TABLE ads (
  id                BIGSERIAL PRIMARY KEY,
  partner_id        BIGINT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  image_url         VARCHAR(500),
  action_url        VARCHAR(500),
  action_text       VARCHAR(100),
  priority          INTEGER NOT NULL DEFAULT 0,
  active            BOOLEAN NOT NULL DEFAULT true,
  start_date        TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date          TIMESTAMP WITH TIME ZONE NOT NULL,
  target_all_users  BOOLEAN NOT NULL DEFAULT true,
  target_user_ids   BIGINT[] NOT NULL DEFAULT '{}',
  impressions       INTEGER NOT NULL DEFAULT 0,
  clicks            INTEGER NOT NULL DEFAULT 0,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMP WITH TIME ZONE
);

-- Composite index for active ad queries
CREATE INDEX idx_ads_partner_active_dates
ON ads(partner_id, active, start_date, end_date)
WHERE deleted_at IS NULL;

-- GIN index for array membership queries
CREATE INDEX idx_ads_target_user_ids
ON ads USING GIN(target_user_ids)
WHERE deleted_at IS NULL;

-- Updated_at trigger (PostgreSQL convention)
CREATE TRIGGER update_ads_updated_at
BEFORE UPDATE ON ads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Relationship Diagram**:

```
┌──────────────┐
│   Partner    │
│              │
│ id (PK)      │
│ name         │
│ domain       │
└──────┬───────┘
       │
       │ 1:N
       │
       ▼
┌──────────────┐
│     Ad       │
│              │
│ id (PK)      │
│ partner_id   │◄── Foreign Key
│ title        │
│ description  │
│ imageUrl     │
│ actionUrl    │
│ priority     │
│ active       │
│ startDate    │
│ endDate      │
│ targetUsers  │
└──────────────┘
```

---

## Data Dictionary

### Table: `ads`

| Column | Type | Nullable | Default | Description | Constraints |
|--------|------|----------|---------|-------------|-------------|
| `id` | BIGINT | NO | autoincrement() | Unique ad identifier | PRIMARY KEY |
| `partner_id` | BIGINT | NO | - | Partner owning this ad | FOREIGN KEY → partners(id) |
| `title` | VARCHAR(200) | NO | - | Ad headline/title | MAX 200 chars |
| `description` | TEXT | YES | NULL | Full ad description/body | Markdown supported |
| `image_url` | VARCHAR(500) | YES | NULL | URL to ad image asset | HTTPS recommended |
| `action_url` | VARCHAR(500) | YES | NULL | Click-through destination | HTTPS recommended |
| `action_text` | VARCHAR(100) | YES | NULL | Call-to-action button text | e.g., "Learn More" |
| `priority` | INTEGER | NO | 0 | Display priority (higher = more important) | 0-100 typical range |
| `active` | BOOLEAN | NO | true | Whether ad is currently active | Admin toggle |
| `start_date` | TIMESTAMP | NO | - | Ad campaign start date/time | Must be ≤ end_date |
| `end_date` | TIMESTAMP | NO | - | Ad campaign end date/time | Must be ≥ start_date |
| `target_all_users` | BOOLEAN | NO | true | If true, show to all users | Overrides targetUserIds |
| `target_user_ids` | BIGINT[] | NO | [] | Array of specific user IDs | Used if targetAllUsers=false |
| `impressions` | INTEGER | NO | 0 | Count of ad views | Incremented by frontend |
| `clicks` | INTEGER | NO | 0 | Count of ad clicks | Incremented by frontend |
| `metadata` | JSONB | NO | {} | Flexible additional data | Partner-specific fields |
| `created_at` | TIMESTAMP | NO | now() | Record creation timestamp | Immutable |
| `updated_at` | TIMESTAMP | NO | now() | Last modification timestamp | Auto-updated |
| `deleted_at` | TIMESTAMP | YES | NULL | Soft delete timestamp | NULL = active |

**Enum Values**: None (all columns use standard types)

**Check Constraints**:

```sql
ALTER TABLE ads
ADD CONSTRAINT check_ads_dates CHECK (start_date <= end_date);

ALTER TABLE ads
ADD CONSTRAINT check_ads_priority CHECK (priority >= 0 AND priority <= 100);

ALTER TABLE ads
ADD CONSTRAINT check_ads_counts CHECK (impressions >= 0 AND clicks >= 0);
```

**Example Data**:

```json
{
  "id": 1001,
  "partnerId": 75,
  "title": "High-Yield Savings Account - 4.5% APY",
  "description": "Earn more with our competitive savings rates. FDIC insured up to $250,000.",
  "imageUrl": "https://cdn.partner.com/ads/savings-promo.jpg",
  "actionUrl": "https://partner.com/products/savings",
  "actionText": "Open Account",
  "priority": 10,
  "active": true,
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-03-31T23:59:59.999Z",
  "targetAllUsers": true,
  "targetUserIds": [],
  "impressions": 1523,
  "clicks": 87,
  "metadata": {
    "campaign_id": "Q1_2025_SAVINGS",
    "budget": 5000,
    "cost_per_click": 0.50
  },
  "createdAt": "2024-12-15T10:30:00.000Z",
  "updatedAt": "2025-01-10T14:22:00.000Z",
  "deletedAt": null
}
```

---

## Migration Strategy

### Migration Files

**Phase 3 Migration** (create_ads_table):

```prisma
-- CreateTable
CREATE TABLE "ads" (
    "id" BIGSERIAL NOT NULL,
    "partner_id" BIGINT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "action_url" VARCHAR(500),
    "action_text" VARCHAR(100),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "target_all_users" BOOLEAN NOT NULL DEFAULT true,
    "target_user_ids" BIGINT[] DEFAULT ARRAY[]::BIGINT[],
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ads_partner_id_active_start_date_end_date_idx"
ON "ads"("partner_id", "active", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "ads_target_user_ids_idx" ON "ads" USING GIN ("target_user_ids");

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_partner_id_fkey"
FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "ads" ADD CONSTRAINT "ads_dates_check" CHECK ("start_date" <= "end_date");
ALTER TABLE "ads" ADD CONSTRAINT "ads_priority_check" CHECK ("priority" >= 0 AND "priority" <= 100);
```

**Prisma Commands**:

```bash
# Generate migration
npx prisma migrate dev --name create_ads_table

# Apply to production
npx prisma migrate deploy

# Verify migration
npx prisma migrate status
```

### Rollback Strategy

**Rollback SQL**:

```sql
-- Drop foreign key constraint
ALTER TABLE ads DROP CONSTRAINT ads_partner_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS ads_partner_id_active_start_date_end_date_idx;
DROP INDEX IF EXISTS ads_target_user_ids_idx;

-- Drop table
DROP TABLE IF EXISTS ads;
```

**Prisma Rollback**:

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back create_ads_table

# OR manually delete from _prisma_migrations table
DELETE FROM _prisma_migrations WHERE migration_name = 'create_ads_table';
```

### Data Seeding

**Seed Script**: `tools/seed/generators/adGenerator.ts`

```typescript
import { PrismaClient, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export async function seedAds(partnerId: bigint, userIds: bigint[]) {
  const ads: Prisma.AdCreateInput[] = [];

  // Create 5 sample ads per partner
  for (let i = 0; i < 5; i++) {
    const startDate = faker.date.future({ years: 0.5 });
    const endDate = faker.date.future({ years: 1, refDate: startDate });

    ads.push({
      partner: { connect: { id: partnerId } },
      title: faker.company.catchPhrase(),
      description: faker.lorem.paragraph(),
      imageUrl: faker.image.url(),
      actionUrl: faker.internet.url(),
      actionText: faker.helpers.arrayElement([
        'Learn More',
        'Get Started',
        'Apply Now',
        'Open Account',
        'View Details'
      ]),
      priority: faker.number.int({ min: 0, max: 100 }),
      active: faker.datatype.boolean({ probability: 0.8 }),
      startDate,
      endDate,
      targetAllUsers: faker.datatype.boolean({ probability: 0.7 }),
      targetUserIds: faker.datatype.boolean({ probability: 0.3 })
        ? faker.helpers.arrayElements(userIds.map(id => Number(id)), { min: 1, max: 5 })
        : [],
      metadata: {
        campaign_id: faker.string.uuid(),
        budget: faker.number.int({ min: 1000, max: 50000 }),
        cost_per_click: faker.number.float({ min: 0.10, max: 2.00, fractionDigits: 2 })
      }
    });
  }

  await prisma.ad.createMany({ data: ads });
  console.log(`✓ Created ${ads.length} ads for partner ${partnerId}`);
}
```

---

## Indexing Strategy

### Index Analysis

| Index Name | Type | Columns | Purpose | Cardinality | Selectivity |
|------------|------|---------|---------|-------------|-------------|
| `ads_pkey` | B-Tree | id | Primary key uniqueness | High | 100% |
| `ads_partner_active_dates` | B-Tree | partner_id, active, start_date, end_date | Active ad queries | Medium | ~80% |
| `ads_target_user_ids` | GIN | target_user_ids | User targeting lookups | Low | ~30% |

### Query Patterns

**Query 1: Get active ads for a partner**

```sql
SELECT * FROM ads
WHERE partner_id = $1
  AND active = true
  AND start_date <= NOW()
  AND end_date >= NOW()
  AND deleted_at IS NULL
ORDER BY priority DESC, created_at DESC;

-- Index Used: ads_partner_active_dates (perfect match)
-- Estimated Rows: 10-50 per partner
```

**Query 2: Get ads targeted at specific user**

```sql
SELECT * FROM ads
WHERE partner_id = $1
  AND active = true
  AND start_date <= NOW()
  AND end_date >= NOW()
  AND (
    target_all_users = true
    OR $2 = ANY(target_user_ids)
  )
  AND deleted_at IS NULL
ORDER BY priority DESC;

-- Index Used: ads_partner_active_dates + ads_target_user_ids
-- Estimated Rows: 5-20 per user
```

**Query 3: Analytics - Top performing ads**

```sql
SELECT title, impressions, clicks,
       (clicks::float / NULLIF(impressions, 0)) AS ctr
FROM ads
WHERE partner_id = $1
  AND deleted_at IS NULL
ORDER BY clicks DESC
LIMIT 10;

-- Index Used: ads_partner_active_dates (partial)
-- Estimated Rows: 10
```

### Index Maintenance

**Monitoring**:

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'ads'
ORDER BY idx_scan DESC;

-- Check index size
SELECT pg_size_pretty(pg_relation_size('ads_partner_active_dates'));
SELECT pg_size_pretty(pg_relation_size('ads_target_user_ids'));
```

**Reindex** (if needed):

```sql
REINDEX INDEX CONCURRENTLY ads_partner_active_dates;
REINDEX INDEX CONCURRENTLY ads_target_user_ids;
```

---

## Performance Considerations

### Query Performance

**Expected Query Times** (with proper indexes):

| Query Type | Expected Rows | Expected Time | Index Used |
|-----------|---------------|---------------|------------|
| Active ads for partner | 10-50 | <5ms | ads_partner_active_dates |
| User-targeted ads | 5-20 | <10ms | Both indexes |
| Analytics queries | 10-100 | <20ms | Primary + partner index |

### Write Performance

**Insert Rate**: Low (1-10 ads/day per partner)

**Update Rate**: Low (priority/active status changes)

**Delete Rate**: Very low (soft deletes via deletedAt)

**Bulk Operations**: None expected

### Storage Estimates

**Per Ad Row**:
- Base columns: ~500 bytes
- Arrays (targetUserIds): 8 bytes × user count
- JSONB (metadata): 100-500 bytes
- Total: ~1KB per ad

**Total Storage** (1000 ads):
- Table data: ~1MB
- Indexes: ~500KB
- Total: ~1.5MB

**Growth Projection**:
- Year 1: ~5000 ads → 5MB
- Year 3: ~15000 ads → 15MB
- Negligible storage impact

---

## Security Considerations

### Data Protection

1. **Partner Isolation**:
   - All queries MUST filter by partnerId
   - Enforced by foreign key constraint + application logic

2. **Soft Deletes**:
   - Use deletedAt for reversible deletion
   - WHERE deleted_at IS NULL in all queries

3. **User Targeting**:
   - targetUserIds stored as array (not exposed in API responses)
   - Privacy-conscious: only show ads to authorized users

### SQL Injection Prevention

**Parameterized Queries** (via Prisma):

```typescript
// ✅ SAFE - Prisma parameterizes automatically
const ads = await prisma.ad.findMany({
  where: {
    partnerId: BigInt(partnerId),
    active: true,
    startDate: { lte: new Date() },
    endDate: { gte: new Date() }
  }
});

// ❌ UNSAFE - Raw SQL (DO NOT USE)
await prisma.$queryRaw`SELECT * FROM ads WHERE partner_id = ${partnerId}`;
```

### Access Control

**API Endpoints**:

```typescript
// GET /api/v2/users/:userId/ads
router.get('/users/:userId/ads', authenticateJWT, (req, res) => {
  // Verify userId matches JWT context
  if (req.params.userId !== req.context.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // ... fetch ads
});
```

**Admin Endpoints** (future):

```typescript
// POST /api/v2/partners/:partnerId/ads (admin only)
router.post('/partners/:partnerId/ads', authenticateJWT, requireAdmin, ...);
```

---

## Rollback Procedures

### Pre-Migration Checklist

- [ ] Backup production database
- [ ] Test migration in staging environment
- [ ] Verify seed data script works
- [ ] Document rollback steps
- [ ] Schedule maintenance window (5 minutes)

### Rollback Steps

**If migration fails during execution**:

```bash
# 1. Check migration status
npx prisma migrate status

# 2. Resolve failed migration
npx prisma migrate resolve --rolled-back create_ads_table

# 3. Verify database state
psql $DATABASE_URL -c "\dt ads"  # Should show table doesn't exist

# 4. Clean up Prisma migrations table
psql $DATABASE_URL -c "DELETE FROM _prisma_migrations WHERE migration_name = 'create_ads_table';"
```

**If migration succeeds but causes issues**:

```bash
# 1. Backup existing ads data (if any)
pg_dump $DATABASE_URL --table=ads > ads_backup.sql

# 2. Drop table and constraints
psql $DATABASE_URL < rollback_ads_table.sql

# 3. Mark migration as rolled back
npx prisma migrate resolve --rolled-back create_ads_table

# 4. Verify application still works without ads
npm test
```

### Rollback SQL Script

**File**: `prisma/migrations/rollback_ads_table.sql`

```sql
-- Rollback script for ads table migration
-- Run this if you need to revert the create_ads_table migration

BEGIN;

-- Drop foreign key constraint
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_partner_id_fkey;

-- Drop check constraints
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_dates_check;
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_priority_check;

-- Drop indexes
DROP INDEX IF EXISTS ads_partner_id_active_start_date_end_date_idx;
DROP INDEX IF EXISTS ads_target_user_ids_idx;

-- Drop table
DROP TABLE IF EXISTS ads CASCADE;

COMMIT;
```

---

## Appendix A: Complete Prisma Schema Update

**File**: `prisma/schema.prisma` (additions only)

```prisma
// Add to existing Partner model
model Partner {
  // ... existing fields ...

  ads                Ad[]  // NEW RELATIONSHIP

  @@map("partners")
}

// NEW MODEL
model Ad {
  id              BigInt    @id @default(autoincrement())
  partnerId       BigInt    @map("partner_id")
  title           String    @db.VarChar(200)
  description     String?   @db.Text
  imageUrl        String?   @map("image_url") @db.VarChar(500)
  actionUrl       String?   @map("action_url") @db.VarChar(500)
  actionText      String?   @map("action_text") @db.VarChar(100)
  priority        Int       @default(0)
  active          Boolean   @default(true)
  startDate       DateTime  @map("start_date")
  endDate         DateTime  @map("end_date")
  targetAllUsers  Boolean   @default(true) @map("target_all_users")
  targetUserIds   BigInt[]  @map("target_user_ids")
  impressions     Int       @default(0)
  clicks          Int       @default(0)
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  partner         Partner   @relation(fields: [partnerId], references: [id], onDelete: Cascade)

  @@index([partnerId, active, startDate, endDate])
  @@index([targetUserIds], type: Gin)
  @@map("ads")
}
```

---

## Appendix B: Testing Checklist

### Unit Tests

- [ ] Ad model validation (title length, date constraints)
- [ ] Ad service - getAdsForUser() with various targeting scenarios
- [ ] Ad service - filtering by active status and date ranges
- [ ] Ad service - priority-based sorting

### Integration Tests

- [ ] POST /api/v2/partners/:partnerId/ads (admin endpoint)
- [ ] GET /api/v2/users/:userId/ads (user endpoint)
- [ ] PATCH /api/v2/ads/:id (update priority, active status)
- [ ] DELETE /api/v2/ads/:id (soft delete)
- [ ] Verify partner isolation (can't access other partners' ads)

### Performance Tests

- [ ] Query performance with 1000 ads
- [ ] Index usage verification
- [ ] Concurrent read operations (100 req/s)
- [ ] Analytics query performance

### Migration Tests

- [ ] Migration applies cleanly to empty database
- [ ] Migration applies to database with existing data
- [ ] Rollback script executes without errors
- [ ] Seed script creates valid test data

---

## Appendix C: Monitoring Queries

### Database Health

```sql
-- Table size monitoring
SELECT
  pg_size_pretty(pg_total_relation_size('ads')) as total_size,
  pg_size_pretty(pg_relation_size('ads')) as table_size,
  pg_size_pretty(pg_indexes_size('ads')) as indexes_size;

-- Row count and growth
SELECT
  count(*) as total_ads,
  count(*) FILTER (WHERE active = true) as active_ads,
  count(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_ads
FROM ads;

-- Active ads by partner
SELECT
  p.name,
  count(*) as ad_count
FROM ads a
JOIN partners p ON a.partner_id = p.id
WHERE a.active = true
  AND a.deleted_at IS NULL
  AND a.start_date <= NOW()
  AND a.end_date >= NOW()
GROUP BY p.name
ORDER BY ad_count DESC;
```

### Performance Metrics

```sql
-- Query performance stats
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%ads%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Index hit ratio (should be >99%)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE
    WHEN idx_scan > 0 THEN round((idx_tup_read::numeric / idx_scan), 2)
    ELSE 0
  END as avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE tablename = 'ads'
ORDER BY idx_scan DESC;
```

---

**End of Database Specification**

**Document Status**: Ready for Implementation
**Next Steps**: Review → Approve → Implement Migration → Test → Deploy
