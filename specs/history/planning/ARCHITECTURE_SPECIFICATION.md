# Backend Compatibility Architecture Specification
**pfm-backend-simulator → 100% responsive-tiles Compatibility**

**Version**: 1.0
**Date**: 2025-10-04
**Status**: Design Phase
**Target**: Complete API v2 compatibility with responsive-tiles frontend

---

## Executive Summary

This specification defines the complete architecture for achieving 100% compatibility between pfm-backend-simulator and the responsive-tiles frontend application. The implementation will deliver **86 new endpoints** across **7 major feature modules** over an estimated **7-8 week period**.

### Current State
- **Implementation**: ~40% complete
- **Database Schema**: 95% complete (excellent foundation)
- **Working Modules**: Budgets (100%), Accounts (80%), Transactions (60%)
- **Critical Gaps**: Goals, Cashflow, Alerts, Tags, Networth, Expenses

### Target State
- **Implementation**: 100% complete
- **Endpoint Coverage**: 108+ API v2 endpoints
- **Feature Parity**: Full responsive-tiles compatibility
- **Performance**: <200ms p95 response time
- **Quality**: 100% HAR flow validation

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Architecture](#2-data-architecture)
3. [API Architecture](#3-api-architecture)
4. [Module Specifications](#4-module-specifications)
5. [Implementation Phases](#5-implementation-phases)
6. [Quality Assurance](#6-quality-assurance)
7. [Performance Specifications](#7-performance-specifications)
8. [Security Architecture](#8-security-architecture)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    responsive-tiles Frontend                 │
│              (React + MobX + Hash Routing)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS/REST API
                        │ JWT Authentication
                        │ /api/v2/* endpoints
┌───────────────────────┴─────────────────────────────────────┐
│                pfm-backend-simulator Backend                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Express.js Application Layer            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Middleware: CORS │ JWT Auth │ Logging │ Errors     │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                  │
│  ┌────────┴────────────────────────────────────────────┐   │
│  │                    Routing Layer                     │   │
│  │  /users  /partners  /budgets  /goals  /cashflow     │   │
│  │  /accounts  /transactions  /tags  /alerts  /networth│   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                  │
│  ┌────────┴────────────────────────────────────────────┐   │
│  │                  Controller Layer                    │   │
│  │  Parse Request → Validate → Call Service → Format   │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                  │
│  ┌────────┴────────────────────────────────────────────┐   │
│  │                   Service Layer                      │   │
│  │  Business Logic │ Calculations │ Aggregations       │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                  │
│  ┌────────┴────────────────────────────────────────────┐   │
│  │                  Prisma ORM Layer                    │   │
│  │  Type-safe DB access │ Migrations │ Transactions    │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                  │
└───────────┴─────────────────────────────────────────────────┘
            │
┌───────────┴─────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  11 Models │ Indexes │ Constraints │ Triggers                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Architecture

**Existing Components** (Keep):
```
src/
├── config/
│   ├── database.ts      ✅ Prisma client singleton
│   ├── logger.ts        ✅ Pino structured logging
│   └── auth.ts          ✅ JWT configuration
│
├── middleware/
│   ├── auth.ts          ✅ JWT authentication (dual format)
│   ├── logging.ts       ✅ Request logging
│   └── errorHandler.ts  ✅ Global error handling
│
├── utils/
│   └── serializers.ts   ✅ Snake_case conversion
```

**New Components** (Build):
```
src/
├── controllers/
│   ├── goalsController.ts          🆕 Priority 1 (Week 1)
│   ├── cashflowController.ts       🆕 Priority 2 (Week 3)
│   ├── alertsController.ts         🆕 Priority 2 (Week 4)
│   ├── expensesController.ts       🆕 Priority 2 (Week 5)
│   └── networthController.ts       🆕 Priority 2 (Week 5)
│
├── services/
│   ├── goalService.ts              🆕 Priority 1
│   ├── cashflowService.ts          🆕 Priority 2
│   ├── alertService.ts             🆕 Priority 2
│   ├── expenseService.ts           ✅ Expand existing
│   ├── networthService.ts          🆕 Priority 2
│   └── calculationService.ts       🆕 Shared calculations
│
├── routes/
│   ├── payoffGoals.ts              🆕 Priority 1
│   ├── savingsGoals.ts             🆕 Priority 1
│   ├── cashflow.ts                 🆕 Priority 2
│   ├── alerts.ts                   🆕 Priority 2
│   └── networth.ts                 🆕 Priority 2
│
└── validators/
    ├── goalSchemas.ts              🆕 Zod validation schemas
    ├── cashflowSchemas.ts          🆕 Zod validation schemas
    └── alertSchemas.ts             🆕 Zod validation schemas
```

### 1.3 Technology Stack

**Core Technologies** (No Changes):
- Node.js 20+
- TypeScript 5.6+
- Express.js 4.19+
- Prisma ORM 5.20+
- PostgreSQL 14+
- JWT (jsonwebtoken 9.0+)
- Pino (logging)
- Jest (testing)

**Additional Libraries** (Consider):
- `node-cache` - Response caching (optional, P3)
- `zod` - Enhanced request validation (already installed)
- `date-fns` - Date calculations for cashflow/expenses
- `decimal.js` - Enhanced decimal arithmetic (Prisma includes)

---

## 2. Data Architecture

### 2.1 Existing Database Schema (Prisma)

**Current Models** (No Changes Needed):
```prisma
✅ Partner          (multi-tenancy, feature flags)
✅ User             (authentication, preferences)
✅ Account          (35+ fields, comprehensive)
✅ Transaction      (financial transactions)
✅ Budget           (monthly budgets)
✅ Goal             (unified model with goalType enum)
✅ Tag              (hierarchical categorization)
✅ Alert            (alert configuration)
✅ Notification     (alert notifications)
✅ AccessToken      (JWT token management)
✅ OAuthClient      (OAuth 2.0 clients)
```

### 2.2 New Database Models Required

**Cashflow Module** (3 new models):

```prisma
// Bill recurring payment
model CashflowBill {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  dueDate         Int       @map("due_date")      // 1-31
  recurrence      String    @default("monthly")    // monthly/biweekly/weekly
  categoryId      BigInt?   @map("category_id")
  accountId       BigInt?   @map("account_id")
  active          Boolean   @default(true)
  stoppedAt       DateTime? @map("stopped_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, deletedAt, active])
  @@map("cashflow_bills")
}

// Income recurring payment
model CashflowIncome {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  receiveDate     Int       @map("receive_date")  // 1-31
  recurrence      String    @default("monthly")
  categoryId      BigInt?   @map("category_id")
  accountId       BigInt?   @map("account_id")
  active          Boolean   @default(true)
  stoppedAt       DateTime? @map("stopped_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, deletedAt, active])
  @@map("cashflow_incomes")
}

// Calculated cashflow events (bills + incomes + projections)
model CashflowEvent {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  sourceType      String    @map("source_type")  // 'bill' | 'income' | 'transaction'
  sourceId        BigInt?   @map("source_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  eventDate       DateTime  @map("event_date") @db.Date
  eventType       String    @map("event_type")  // 'income' | 'expense'
  accountId       BigInt?   @map("account_id")
  processed       Boolean   @default(false)
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, eventDate, deletedAt])
  @@index([sourceType, sourceId])
  @@map("cashflow_events")
}
```

**Expense Aggregation** (1 new model - optional, can calculate on-the-fly):

```prisma
// Pre-calculated expense summaries (cache table)
model ExpenseSummary {
  id                BigInt    @id @default(autoincrement())
  userId            BigInt    @map("user_id")
  periodStart       DateTime  @map("period_start") @db.Date
  periodEnd         DateTime  @map("period_end") @db.Date
  tagId             BigInt?   @map("tag_id")
  tagName           String?   @map("tag_name")
  totalAmount       Decimal   @map("total_amount") @db.Decimal(12, 2)
  transactionCount  Int       @map("transaction_count")
  averageAmount     Decimal   @map("average_amount") @db.Decimal(12, 2)
  metadata          Json      @default("{}")
  createdAt         DateTime  @default(now()) @map("created_at")

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, periodStart, periodEnd, tagId])
  @@index([userId, periodStart, periodEnd])
  @@map("expense_summaries")
}
```

**User Model Updates** (Add relationships):

```prisma
model User {
  // ... existing fields ...

  cashflowBills     CashflowBill[]
  cashflowIncomes   CashflowIncome[]
  cashflowEvents    CashflowEvent[]
  expenseSummaries  ExpenseSummary[]  // Optional
}
```

### 2.3 Database Migration Strategy

**Migration Files** (Prisma format):
```bash
# Create migration for cashflow models
npx prisma migrate dev --name add_cashflow_models

# Create migration for expense summaries (optional)
npx prisma migrate dev --name add_expense_summaries

# Apply all migrations
npx prisma migrate deploy
```

**Migration Timing**:
- **Week 3**: Cashflow models (CashflowBill, CashflowIncome, CashflowEvent)
- **Week 5**: ExpenseSummary model (if needed for performance)

**Rollback Plan**:
- All migrations reversible via Prisma
- Backup database before each migration
- Test migrations in development environment first

---

## 3. API Architecture

### 3.1 RESTful API Design Principles

**Endpoint Patterns**:
```
GET    /api/v2/resources              → List all resources
GET    /api/v2/resources/:id          → Get single resource
POST   /api/v2/resources              → Create resource
PUT    /api/v2/resources/:id          → Update resource (full)
PATCH  /api/v2/resources/:id          → Update resource (partial)
DELETE /api/v2/resources/:id          → Delete resource (soft delete)

# User-scoped resources
GET    /api/v2/users/:userId/resources
POST   /api/v2/users/:userId/resources
PUT    /api/v2/users/:userId/resources/:id
DELETE /api/v2/users/:userId/resources/:id

# Special actions (member routes)
PUT    /api/v2/users/:userId/resources/:id/archive
PUT    /api/v2/users/:userId/resources/:id/stop
POST   /api/v2/users/:userId/resources/:id/activate

# Nested resources
GET    /api/v2/users/:userId/accounts/:id/transactions
GET    /api/v2/users/:userId/budgets/:id/transactions
```

### 3.2 Response Format Specification

**Success Response Structure**:
```typescript
// Single resource
{
  "resource_name": {
    "id": 123,
    "field_one": "value",
    "field_two": "value",
    "created_at": "2025-10-04T12:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z",
    "links": {
      "related_resource": [1, 2, 3]
    }
  }
}

// Collection
{
  "resource_names": [
    { "id": 1, ...},
    { "id": 2, ...}
  ]
}
```

**Error Response Structure**:
```typescript
// Validation error (400)
{
  "error": "Validation failed",
  "details": {
    "field_name": ["is required", "must be positive"]
  }
}

// Not found (404)
{
  "error": "Resource not found"
}

// Unauthorized (401)
{
  "error": "Missing or invalid authorization header"
}

// Server error (500)
{
  "error": "Internal server error"
}
```

**Field Naming Conventions**:
- **Keys**: `snake_case` (budget_amount, created_at)
- **Values**: Type-appropriate (strings, numbers, booleans, arrays, objects)
- **Dates**: ISO 8601 format (`2025-10-04T12:00:00Z`)
- **Date-only**: `YYYY-MM-DD` format
- **Currency**: String with 2 decimals (`"500.00"`)
- **IDs**: Numbers (BigInt converted to Number)
- **Booleans**: `true`/`false` (not 1/0)

### 3.3 Authentication & Authorization

**JWT Token Structure**:
```typescript
// Standard format (primary)
{
  "userId": 123,
  "partnerId": 456,
  "iat": 1696435200,
  "exp": 1696436100
}

// responsive-tiles format (supported)
{
  "sub": 123,      // userId
  "iss": 456,      // partnerId
  "aud": "pfm-backend-simulator",
  "iat": 1696435200,
  "exp": 1696436100
}
```

**Request Context**:
```typescript
// Added by authenticateJWT middleware
req.context = {
  userId: bigint,    // From JWT
  partnerId: bigint  // From JWT
}
```

**Authorization Rules**:
- All user-scoped endpoints require JWT authentication
- Users can only access their own resources (userId scope)
- Partner-scoped resources filtered by partnerId
- Admin endpoints require special claims (future)

---

## 4. Module Specifications

### 4.1 Goals Module (Priority 1)

**Requirements**:
- Dual goal types: Payoff (debt reduction) + Savings (wealth building)
- CRUD operations for both types
- Archive functionality
- Progress calculation
- Image support
- Status tracking (active/risk/complete)

**Endpoints** (14 total):

**Payoff Goals**:
```typescript
GET    /api/v2/users/:userId/payoff_goals
GET    /api/v2/users/:userId/payoff_goals/:id
POST   /api/v2/users/:userId/payoff_goals
PUT    /api/v2/users/:userId/payoff_goals/:id
DELETE /api/v2/users/:userId/payoff_goals/:id
PUT    /api/v2/users/:userId/payoff_goals/:id/archive
GET    /api/v2/payoff_goals  // Goal images catalog
```

**Savings Goals**:
```typescript
GET    /api/v2/users/:userId/savings_goals
GET    /api/v2/users/:userId/savings_goals/:id
POST   /api/v2/users/:userId/savings_goals
PUT    /api/v2/users/:userId/savings_goals/:id
DELETE /api/v2/users/:userId/savings_goals/:id
PUT    /api/v2/users/:userId/savings_goals/:id/archive
GET    /api/v2/savings_goals  // Goal images catalog
```

**Response Format** (Payoff Goal):
```json
{
  "payoff_goal": {
    "id": 123,
    "name": "Pay off credit card",
    "state": "active",
    "status": "under",
    "percent_complete": 35.5,
    "initial_value": "5000.00",
    "current_value": "3225.00",
    "target_value": "0.00",
    "monthly_contribution": "150.00",
    "target_completion_on": "2026-12-31",
    "image_name": "credit_card.jpg",
    "image_url": "https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg",
    "complete": false,
    "created_at": "2025-10-04T12:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z",
    "links": {
      "accounts": [456]
    }
  }
}
```

**Response Format** (Savings Goal):
```json
{
  "savings_goal": {
    "id": 124,
    "name": "Emergency Fund",
    "state": "active",
    "status": "under",
    "percent_complete": 60.0,
    "initial_value": "0.00",
    "current_value": "6000.00",
    "target_value": "10000.00",
    "monthly_contribution": "500.00",
    "target_completion_on": "2026-06-30",
    "image_name": "emergency_fund.jpg",
    "image_url": "https://content.geezeo.com/images/savings_goal_images/emergency_fund.jpg",
    "complete": false,
    "created_at": "2025-10-04T12:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z",
    "links": {
      "accounts": [789]
    }
  }
}
```

**Business Logic**:

```typescript
// Progress calculation (Payoff)
function calculatePayoffProgress(goal: Goal): number {
  const initial = new Decimal(goal.metadata.initialValue || goal.currentAmount);
  const current = goal.currentAmount;
  const paidOff = initial.minus(current);
  return Math.min(100, Math.max(0, paidOff.div(initial).mul(100).toNumber()));
}

// Progress calculation (Savings)
function calculateSavingsProgress(goal: Goal): number {
  return Math.min(100, Math.max(0,
    goal.currentAmount.div(goal.targetAmount).mul(100).toNumber()
  ));
}

// Status calculation
function calculateGoalStatus(goal: Goal, progress: number): string {
  if (progress >= 100) return 'complete';

  if (!goal.targetDate) return 'under';

  const now = new Date();
  const target = new Date(goal.targetDate);
  const daysRemaining = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const weeksRemaining = daysRemaining / 7;
  const progressNeeded = 100 - progress;
  const progressPerWeekNeeded = progressNeeded / weeksRemaining;

  // Risk if need >2% per week
  return progressPerWeekNeeded > 2 ? 'risk' : 'under';
}
```

**Validation Rules**:
```typescript
// Payoff goal creation
const payoffGoalSchema = z.object({
  payoff_goal: z.object({
    name: z.string().min(1).max(255),
    current_value: z.string().regex(/^\d+\.\d{2}$/),  // "1000.00"
    account_id: z.string().or(z.number()),
    target_completion_on: z.string().optional(),  // ISO date
    monthly_contribution: z.string().optional(),
    image_name: z.string().optional(),
    image_url: z.string().url().optional()
  })
});

// Savings goal creation
const savingsGoalSchema = z.object({
  savings_goal: z.object({
    name: z.string().min(1).max(255),
    target_value: z.string().regex(/^\d+\.\d{2}$/),
    current_value: z.string().optional(),
    account_id: z.string().or(z.number()).optional(),
    target_completion_on: z.string().optional(),
    monthly_contribution: z.string().optional(),
    image_name: z.string().optional(),
    image_url: z.string().url().optional()
  })
});
```

### 4.2 Cashflow Module (Priority 2)

**Requirements**:
- Bill management (recurring expenses)
- Income management (recurring income)
- Event projection (next 90 days)
- Calendar view support
- Account association
- Start/stop functionality

**Endpoints** (15 total):

```typescript
// Cashflow summary
GET    /api/v2/users/:userId/cashflow
PUT    /api/v2/users/:userId/cashflow  // Update settings

// Bills
GET    /api/v2/users/:userId/cashflow/bills
POST   /api/v2/users/:userId/cashflow/bills
PUT    /api/v2/users/:userId/cashflow/bills/:id
DELETE /api/v2/users/:userId/cashflow/bills/:id
PUT    /api/v2/users/:userId/cashflow/bills/:id/stop

// Incomes
GET    /api/v2/users/:userId/cashflow/incomes
POST   /api/v2/users/:userId/cashflow/incomes
PUT    /api/v2/users/:userId/cashflow/incomes/:id
DELETE /api/v2/users/:userId/cashflow/incomes/:id
PUT    /api/v2/users/:userId/cashflow/incomes/:id/stop

// Events (calculated projections)
GET    /api/v2/users/:userId/cashflow/events
PUT    /api/v2/users/:userId/cashflow/events/:id
DELETE /api/v2/users/:userId/cashflow/events/:id
```

**Response Format** (Cashflow Summary):
```json
{
  "cashflow": {
    "total_income": "5000.00",
    "total_bills": "3200.00",
    "net_cashflow": "1800.00",
    "start_date": "2025-10-01",
    "end_date": "2025-12-31",
    "bills_count": 12,
    "incomes_count": 2,
    "events_count": 45,
    "settings": {
      "auto_categorize": true,
      "show_projections": true,
      "projection_days": 90
    }
  }
}
```

**Response Format** (Bill):
```json
{
  "bill": {
    "id": 123,
    "name": "Electric Bill",
    "amount": "120.00",
    "due_date": 15,
    "recurrence": "monthly",
    "category_id": 456,
    "account_id": 789,
    "active": true,
    "stopped_at": null,
    "created_at": "2025-10-04T12:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z",
    "links": {
      "category": 456,
      "account": 789
    }
  }
}
```

**Response Format** (Cashflow Event):
```json
{
  "event": {
    "id": 123,
    "source_type": "bill",
    "source_id": 456,
    "name": "Electric Bill",
    "amount": "-120.00",
    "event_date": "2025-10-15",
    "event_type": "expense",
    "account_id": 789,
    "processed": false,
    "metadata": {
      "recurrence": "monthly",
      "original_due_date": 15
    }
  }
}
```

**Business Logic**:

```typescript
// Generate cashflow events for next 90 days
async function generateCashflowEvents(userId: bigint): Promise<CashflowEvent[]> {
  const bills = await prisma.cashflowBill.findMany({
    where: { userId, active: true, deletedAt: null }
  });

  const incomes = await prisma.cashflowIncome.findMany({
    where: { userId, active: true, deletedAt: null }
  });

  const events: CashflowEvent[] = [];
  const startDate = new Date();
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  // Project bills
  for (const bill of bills) {
    const billEvents = projectRecurring(
      bill, 'bill', 'expense', startDate, endDate
    );
    events.push(...billEvents);
  }

  // Project incomes
  for (const income of incomes) {
    const incomeEvents = projectRecurring(
      income, 'income', 'income', startDate, endDate
    );
    events.push(...incomeEvents);
  }

  // Sort by date
  events.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  return events;
}

// Project recurring item to events
function projectRecurring(
  item: CashflowBill | CashflowIncome,
  sourceType: string,
  eventType: string,
  startDate: Date,
  endDate: Date
): CashflowEvent[] {
  const events: CashflowEvent[] = [];
  const dueDate = 'dueDate' in item ? item.dueDate : item.receiveDate;
  const recurrence = item.recurrence;

  let current = new Date(startDate);
  current.setDate(dueDate);

  while (current <= endDate) {
    if (current >= startDate) {
      events.push({
        sourceType,
        sourceId: item.id,
        name: item.name,
        amount: item.amount,
        eventDate: new Date(current),
        eventType,
        accountId: item.accountId,
        processed: false,
        metadata: { recurrence, originalDueDate: dueDate }
      });
    }

    // Advance to next occurrence
    if (recurrence === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else if (recurrence === 'biweekly') {
      current.setDate(current.getDate() + 14);
    } else if (recurrence === 'weekly') {
      current.setDate(current.getDate() + 7);
    }
  }

  return events;
}
```

### 4.3 Alerts Module (Priority 2)

**Requirements**:
- 6 alert types (account_threshold, goal, merchant_name, spending_target, transaction_limit, upcoming_bill)
- Alert configuration CRUD
- Notification generation
- Delivery destinations (email/SMS)
- Alert triggering logic

**Endpoints** (20 total):

```typescript
// Alerts
GET    /api/v2/users/:userId/alerts
GET    /api/v2/users/:userId/alerts/:id
DELETE /api/v2/users/:userId/alerts/:id

// Alert types (CREATE + UPDATE for each)
POST   /api/v2/users/:userId/alerts/account_thresholds
PUT    /api/v2/users/:userId/alerts/account_thresholds/:id
POST   /api/v2/users/:userId/alerts/goals
PUT    /api/v2/users/:userId/alerts/goals/:id
POST   /api/v2/users/:userId/alerts/merchant_names
PUT    /api/v2/users/:userId/alerts/merchant_names/:id
POST   /api/v2/users/:userId/alerts/spending_targets
PUT    /api/v2/users/:userId/alerts/spending_targets/:id
POST   /api/v2/users/:userId/alerts/transaction_limits
PUT    /api/v2/users/:userId/alerts/transaction_limits/:id
POST   /api/v2/users/:userId/alerts/upcoming_bills
PUT    /api/v2/users/:userId/alerts/upcoming_bills/:id

// Destinations
GET    /api/v2/users/:userId/alerts/destinations
PUT    /api/v2/users/:userId/alerts/destinations

// Notifications
GET    /api/v2/users/:userId/alerts/notifications
GET    /api/v2/users/:userId/alerts/notifications/:id
DELETE /api/v2/users/:userId/alerts/notifications/:id
```

**Response Format** (Alert):
```json
{
  "alert": {
    "id": 123,
    "alert_type": "account_threshold",
    "name": "Low Balance Alert",
    "source_type": "account",
    "source_id": 456,
    "conditions": {
      "threshold": "100.00",
      "operator": "less_than"
    },
    "email_delivery": true,
    "sms_delivery": false,
    "active": true,
    "last_triggered_at": "2025-10-03T12:00:00Z",
    "created_at": "2025-10-04T12:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z"
  }
}
```

### 4.4 Tags Module (Priority 1)

**Requirements**:
- System tags (partner-provided)
- User tags (custom)
- Hierarchical structure (parent tags)
- Tag management

**Endpoints** (3 total):

```typescript
GET    /api/v2/tags                    // System/partner tags
GET    /api/v2/users/:userId/tags      // User + system tags
PUT    /api/v2/users/:userId/tags      // Update user tags
```

**Response Format**:
```json
{
  "tags": [
    {
      "id": 1,
      "name": "Groceries",
      "parent_tag_id": null,
      "tag_type": "system",
      "icon": "shopping-cart",
      "color": "#FF5733"
    },
    {
      "id": 2,
      "name": "My Custom Tag",
      "parent_tag_id": 1,
      "tag_type": "user",
      "icon": null,
      "color": "#3498DB"
    }
  ]
}
```

### 4.5 Expenses Module (Priority 2)

**Requirements**:
- Expense aggregation by tag/category
- Time period filtering (month, last 30 days, custom)
- Transaction count and averages

**Endpoints** (6 total):

```typescript
GET    /api/v2/users/:userId/expenses              // Default: current month
GET    /api/v2/users/:userId/expenses/last_month
GET    /api/v2/users/:userId/expenses/this_month
GET    /api/v2/users/:userId/expenses/last_thirty_days
GET    /api/v2/users/:userId/expenses/only?tags=...     // Include only tags
GET    /api/v2/users/:userId/expenses/except?tags=...   // Exclude tags
```

**Response Format**:
```json
{
  "expenses": {
    "total": "2450.50",
    "period_start": "2025-10-01",
    "period_end": "2025-10-31",
    "categories": [
      {
        "tag_id": 123,
        "tag_name": "Groceries",
        "amount": "650.00",
        "transaction_count": 15,
        "average_amount": "43.33",
        "percent_of_total": 26.5
      },
      {
        "tag_id": 124,
        "tag_name": "Dining",
        "amount": "450.50",
        "transaction_count": 12,
        "average_amount": "37.54",
        "percent_of_total": 18.4
      }
    ]
  }
}
```

**Business Logic**:

```typescript
async function calculateExpenses(
  userId: bigint,
  startDate: Date,
  endDate: Date,
  includeTags?: bigint[],
  excludeTags?: bigint[]
): Promise<ExpenseData> {
  // Query transactions in period
  const where: any = {
    userId,
    postedAt: { gte: startDate, lte: endDate },
    transactionType: 'debit',
    deletedAt: null
  };

  if (includeTags?.length) {
    where.primaryTagId = { in: includeTags };
  }

  if (excludeTags?.length) {
    where.primaryTagId = { notIn: excludeTags };
  }

  const transactions = await prisma.transaction.findMany({ where });

  // Group by tag
  const byTag = new Map<bigint, Decimal>();
  const countByTag = new Map<bigint, number>();

  for (const txn of transactions) {
    if (!txn.primaryTagId) continue;

    const current = byTag.get(txn.primaryTagId) || new Decimal(0);
    byTag.set(txn.primaryTagId, current.add(txn.amount.abs()));

    const count = countByTag.get(txn.primaryTagId) || 0;
    countByTag.set(txn.primaryTagId, count + 1);
  }

  // Calculate totals and percentages
  const total = Array.from(byTag.values())
    .reduce((sum, amt) => sum.add(amt), new Decimal(0));

  const categories = [];
  for (const [tagId, amount] of byTag.entries()) {
    const count = countByTag.get(tagId) || 0;
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });

    categories.push({
      tag_id: tagId,
      tag_name: tag?.name || 'Unknown',
      amount: amount.toFixed(2),
      transaction_count: count,
      average_amount: amount.div(count).toFixed(2),
      percent_of_total: amount.div(total).mul(100).toNumber()
    });
  }

  return {
    total: total.toFixed(2),
    period_start: startDate,
    period_end: endDate,
    categories
  };
}
```

### 4.6 Networth Module (Priority 2)

**Requirements**:
- Calculate total networth from accounts
- Filter by account inclusion flags
- Historical networth (future enhancement)

**Endpoints** (2 total):

```typescript
GET    /api/v2/users/:userId/networth
GET    /api/v2/users/:userId/networth/accounts  // Networth by account
```

**Response Format**:
```json
{
  "networth": {
    "total": "125450.00",
    "assets": "150000.00",
    "liabilities": "24550.00",
    "calculated_at": "2025-10-04T12:00:00Z",
    "accounts_included": 8,
    "accounts_excluded": 2
  }
}
```

**Business Logic**:

```typescript
async function calculateNetworth(userId: bigint): Promise<NetworthData> {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      includeInNetworth: true,
      state: 'active',
      archivedAt: null,
      deletedAt: null
    }
  });

  let assets = new Decimal(0);
  let liabilities = new Decimal(0);

  for (const account of accounts) {
    const balance = account.balance;

    // Asset accounts have positive balance
    if (['checking', 'savings', 'investment'].includes(account.accountType)) {
      assets = assets.add(balance);
    }
    // Liability accounts have negative balance (debt)
    else if (['credit_card', 'loan', 'mortgage', 'line_of_credit'].includes(account.accountType)) {
      liabilities = liabilities.add(balance.abs());
    }
  }

  const total = assets.minus(liabilities);

  return {
    total: total.toFixed(2),
    assets: assets.toFixed(2),
    liabilities: liabilities.toFixed(2),
    calculated_at: new Date(),
    accounts_included: accounts.length,
    accounts_excluded: await prisma.account.count({
      where: { userId, includeInNetworth: false }
    })
  };
}
```

---

## 5. Implementation Phases

### 5.1 Phase 1: Core Features (Weeks 1-2)

**Week 1: Goals Module**

*Day 1-2: Setup & Database*
- [ ] Create `goalsController.ts`
- [ ] Create `goalService.ts`
- [ ] Create `payoffGoals.ts` routes
- [ ] Create `savingsGoals.ts` routes
- [ ] Create goal validation schemas

*Day 3-4: Payoff Goals*
- [ ] Implement GET /payoff_goals (list)
- [ ] Implement GET /payoff_goals/:id (show)
- [ ] Implement POST /payoff_goals (create)
- [ ] Implement PUT /payoff_goals/:id (update)
- [ ] Implement DELETE /payoff_goals/:id (delete)
- [ ] Implement PUT /payoff_goals/:id/archive

*Day 5: Savings Goals*
- [ ] Implement GET /savings_goals (list)
- [ ] Implement GET /savings_goals/:id (show)
- [ ] Implement POST /savings_goals (create)
- [ ] Implement PUT /savings_goals/:id (update)
- [ ] Implement DELETE /savings_goals/:id (delete)
- [ ] Implement PUT /savings_goals/:id/archive

*Day 6-7: Goal Images & Testing*
- [ ] Implement GET /api/v2/payoff_goals (images)
- [ ] Implement GET /api/v2/savings_goals (images)
- [ ] Write unit tests for goalsController
- [ ] Write integration tests for goals API
- [ ] Test with responsive-tiles frontend

**Week 2: Remaining Priority 1**

*Day 1-2: Accounts & Transactions*
- [ ] Implement POST /accounts (create account)
- [ ] Implement POST /transactions (create transaction)
- [ ] Update accountsController
- [ ] Update transactionsController
- [ ] Write tests

*Day 3-4: Tags*
- [ ] Implement GET /tags (system tags)
- [ ] Implement GET /users/:userId/tags (user + system)
- [ ] Implement PUT /users/:userId/tags (update)
- [ ] Create tagsService
- [ ] Write tests

*Day 5: Users*
- [ ] Implement PUT /users/current (profile update)
- [ ] Update usersController
- [ ] Write tests

*Day 6-7: Integration Testing*
- [ ] Run all HAR flows against simulator
- [ ] Validate response formats
- [ ] Fix any compatibility issues
- [ ] Update documentation

**Deliverables**:
- ✅ Goals fully functional (14 endpoints)
- ✅ Account creation working
- ✅ Transaction creation working
- ✅ Tags management complete
- ✅ User profile updates working
- ✅ All Priority 1 endpoints tested

### 5.2 Phase 2: Important Features (Weeks 3-5)

**Week 3: Cashflow Module**

*Day 1: Database Migration*
- [ ] Add CashflowBill, CashflowIncome, CashflowEvent models
- [ ] Run Prisma migration
- [ ] Update User model relationships
- [ ] Seed test data

*Day 2-3: Bills & Incomes*
- [ ] Create cashflowController
- [ ] Create cashflowService
- [ ] Implement bills CRUD (6 endpoints)
- [ ] Implement incomes CRUD (6 endpoints)
- [ ] Implement stop endpoints

*Day 4-5: Events & Summary*
- [ ] Implement event projection logic
- [ ] Implement GET /cashflow (summary)
- [ ] Implement PUT /cashflow (settings)
- [ ] Implement events endpoints (3 endpoints)

*Day 6-7: Testing*
- [ ] Unit tests for cashflow logic
- [ ] Integration tests for cashflow API
- [ ] Test event projections
- [ ] Frontend integration testing

**Week 4: Alerts Module**

*Day 1-2: Alert Infrastructure*
- [ ] Create alertsController
- [ ] Create alertService
- [ ] Implement base alert endpoints (3 endpoints)
- [ ] Implement notification endpoints (3 endpoints)

*Day 3-5: Alert Types*
- [ ] Implement account_threshold alerts (2 endpoints)
- [ ] Implement goal alerts (2 endpoints)
- [ ] Implement merchant_name alerts (2 endpoints)
- [ ] Implement spending_target alerts (2 endpoints)
- [ ] Implement transaction_limit alerts (2 endpoints)
- [ ] Implement upcoming_bill alerts (2 endpoints)

*Day 6-7: Destinations & Triggering*
- [ ] Implement alert destinations (2 endpoints)
- [ ] Implement alert triggering logic
- [ ] Write tests
- [ ] Frontend integration testing

**Week 5: Expenses, Networth, Accounts**

*Day 1-2: Expenses*
- [ ] Expand expenseService
- [ ] Implement expense aggregation logic
- [ ] Implement 6 expense endpoints
- [ ] Write tests

*Day 3: Networth*
- [ ] Create networthService
- [ ] Implement networth calculation
- [ ] Implement 2 networth endpoints
- [ ] Write tests

*Day 4-5: Account Endpoints*
- [ ] Implement account archive
- [ ] Implement account credentials update
- [ ] Implement account classify
- [ ] Implement potential_cashflow
- [ ] Implement account/:id/transactions
- [ ] Write tests

*Day 6-7: Remaining*
- [ ] Implement budget/:id/transactions
- [ ] Implement transaction search
- [ ] Integration testing
- [ ] Response format validation

**Deliverables**:
- ✅ Cashflow module complete (15 endpoints)
- ✅ Alerts module complete (20 endpoints)
- ✅ Expenses module complete (6 endpoints)
- ✅ Networth module complete (2 endpoints)
- ✅ All account operations working
- ✅ All Priority 2 endpoints tested

### 5.3 Phase 3: Advanced Features (Week 6)

**Week 6: Polish & Advanced**

*Day 1-3: Advanced Features*
- [ ] Implement account aggregation endpoints
- [ ] Implement pending accounts
- [ ] Implement activity feed
- [ ] Implement ads endpoints
- [ ] Implement harvest endpoints

*Day 4-5: Error Handling*
- [ ] Comprehensive error messages
- [ ] Validation error details
- [ ] Rate limiting (optional)
- [ ] Request timeout handling

*Day 6-7: Documentation*
- [ ] API documentation update
- [ ] Response format documentation
- [ ] Integration guide
- [ ] Deployment guide

**Deliverables**:
- ✅ All documented endpoints implemented
- ✅ Error handling comprehensive
- ✅ Documentation complete

### 5.4 Phase 4: Testing & Validation (Week 7)

**Week 7: Quality Assurance**

*Day 1-2: HAR Flow Validation*
- [ ] Run complete HAR capture suite
- [ ] Validate all response formats
- [ ] Fix any format mismatches
- [ ] Document any intentional differences

*Day 3: Performance Testing*
- [ ] Load testing with k6 or Artillery
- [ ] Identify slow endpoints
- [ ] Optimize queries
- [ ] Add caching where needed

*Day 4: Security Audit*
- [ ] OWASP Top 10 review
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF token validation
- [ ] Rate limiting review

*Day 5-7: Final Testing*
- [ ] Full regression testing
- [ ] Edge case testing
- [ ] Error scenario testing
- [ ] Frontend integration testing
- [ ] Production deployment dry run

**Deliverables**:
- ✅ All HAR flows pass 100%
- ✅ Performance meets SLAs
- ✅ Security audit complete
- ✅ Production-ready simulator

---

## 6. Quality Assurance

### 6.1 Testing Strategy

**Test Pyramid**:
```
                      ┌─────────────┐
                      │  E2E Tests  │  10%
                      │  (Frontend) │
                      └─────────────┘
                   ┌─────────────────────┐
                   │ Integration Tests   │  30%
                   │  (API Endpoints)    │
                   └─────────────────────┘
              ┌──────────────────────────────┐
              │      Unit Tests              │  60%
              │  (Services, Controllers)     │
              └──────────────────────────────┘
```

**Test Coverage Targets**:
- Unit tests: >80% coverage
- Integration tests: 100% endpoint coverage
- E2E tests: Critical user flows only

### 6.2 Testing Tools

**Unit & Integration Testing**:
```typescript
// tests/integration/goals.test.ts
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';

describe('Goals API', () => {
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup test user
    const user = await createTestUser();
    userId = user.id.toString();
    authToken = generateJWT(user);
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('POST /api/v2/users/:userId/payoff_goals', () => {
    it('creates payoff goal with valid data', async () => {
      const res = await request(app)
        .post(`/api/v2/users/${userId}/payoff_goals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payoff_goal: {
            name: 'Pay off credit card',
            current_value: '1000.00',
            account_id: '123'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.payoff_goal).toBeDefined();
      expect(res.body.payoff_goal.name).toBe('Pay off credit card');
    });

    it('returns 400 with missing required fields', async () => {
      const res = await request(app)
        .post(`/api/v2/users/${userId}/payoff_goals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payoff_goal: { name: 'Incomplete' }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
```

**Response Format Validation**:
```typescript
// tests/utils/schemaValidation.ts
import { z } from 'zod';

export const PayoffGoalSchema = z.object({
  payoff_goal: z.object({
    id: z.number(),
    name: z.string(),
    state: z.enum(['active', 'archived']),
    status: z.enum(['under', 'risk', 'complete']),
    percent_complete: z.number().min(0).max(100),
    current_value: z.string().regex(/^\d+\.\d{2}$/),
    target_value: z.literal('0.00'),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    links: z.object({
      accounts: z.array(z.number())
    })
  })
});

export function validatePayoffGoalResponse(data: unknown): boolean {
  try {
    PayoffGoalSchema.parse(data);
    return true;
  } catch (error) {
    console.error('Schema validation failed:', error);
    return false;
  }
}
```

### 6.3 Continuous Integration

**GitHub Actions Workflow**:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Check coverage
        run: npm run test:coverage
```

---

## 7. Performance Specifications

### 7.1 Response Time SLAs

**Performance Targets** (p95):
```
Simple GET (single resource):    < 50ms
List GET (collection):            < 100ms
POST/PUT (create/update):         < 150ms
Complex aggregations:             < 200ms
DELETE operations:                < 50ms
```

### 7.2 Database Optimization

**Required Indexes**:
```prisma
model Budget {
  @@index([userId, deletedAt])
  @@index([showOnDashboard])
}

model Goal {
  @@index([userId, goalType, deletedAt, archivedAt])
  @@index([targetDate])
}

model Transaction {
  @@index([userId, accountId, postedAt])
  @@index([postedAt])
  @@index([primaryTagId])
}

model Account {
  @@index([userId, state, archivedAt])
  @@index([partnerId])
  @@index([includeInNetworth])
}

model CashflowBill {
  @@index([userId, deletedAt, active])
}

model CashflowIncome {
  @@index([userId, deletedAt, active])
}

model CashflowEvent {
  @@index([userId, eventDate, deletedAt])
  @@index([sourceType, sourceId])
}
```

### 7.3 Query Optimization

**N+1 Prevention**:
```typescript
// Bad: N+1 queries
const budgets = await prisma.budget.findMany({ where: { userId } });
for (const budget of budgets) {
  budget.spent = await calculateSpent(budget.id); // N queries
}

// Good: Batch calculation
const budgets = await prisma.budget.findMany({ where: { userId } });
const spent = await calculateAllBudgetSpent(budgets.map(b => b.id));
budgets.forEach(budget => {
  budget.spent = spent.get(budget.id);
});
```

**Caching Strategy** (Optional, P3):
```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getCachedExpenses(userId: bigint, period: string) {
  const cacheKey = `expenses:${userId}:${period}`;
  const cached = cache.get(cacheKey);

  if (cached) return cached;

  const expenses = await calculateExpenses(userId, period);
  cache.set(cacheKey, expenses);
  return expenses;
}
```

---

## 8. Security Architecture

### 8.1 Authentication

**JWT Security**:
- Algorithm: HS256
- Secret: 32+ characters
- Expiration: 15 minutes (configurable)
- Refresh tokens: Not implemented (future)

### 8.2 Authorization

**Resource Scoping**:
```typescript
// All user-scoped queries must include userId
const budgets = await prisma.budget.findMany({
  where: {
    userId: req.context.userId,  // From JWT
    partnerId: req.context.partnerId,  // From JWT
    deletedAt: null
  }
});
```

### 8.3 Input Validation

**Zod Schemas**:
```typescript
// Validate all incoming data
const createGoalSchema = z.object({
  name: z.string().min(1).max(255),
  current_value: z.string().regex(/^\d+\.\d{2}$/),
  account_id: z.string().or(z.number())
});

// In controller
try {
  const validated = createGoalSchema.parse(req.body.payoff_goal);
} catch (error) {
  return res.status(400).json({
    error: 'Validation failed',
    details: error.errors
  });
}
```

### 8.4 SQL Injection Prevention

**Prisma Protections**:
- Parameterized queries (automatic)
- Type-safe query builder
- No raw SQL (unless necessary)

### 8.5 Rate Limiting (Optional, P3)

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/v2', limiter);
```

---

## Appendices

### A. Endpoint Checklist

**Priority 1** (23 endpoints):
- [ ] 14 Goals endpoints (payoff + savings)
- [ ] 3 Tags endpoints
- [ ] 1 POST /accounts
- [ ] 1 POST /transactions
- [ ] 1 PUT /users/current
- [ ] 3 Remaining user/partner endpoints

**Priority 2** (54 endpoints):
- [ ] 15 Cashflow endpoints
- [ ] 20 Alerts endpoints
- [ ] 6 Expenses endpoints
- [ ] 2 Networth endpoints
- [ ] 6 Account advanced endpoints
- [ ] 5 Miscellaneous endpoints

**Priority 3** (9 endpoints):
- [ ] Account aggregation
- [ ] Pending accounts
- [ ] Activity feed
- [ ] Ads
- [ ] Harvest

### B. Response Format Examples

See Section 4 (Module Specifications) for detailed response formats for each module.

### C. Migration Commands

```bash
# Create new migration
npx prisma migrate dev --name add_cashflow_models

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### D. Testing Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/integration/goals.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

**Document Status**: ✅ Complete
**Review Required**: Yes
**Approval Required**: Yes
**Implementation Start**: Upon approval
**Estimated Completion**: 7-8 weeks from start
