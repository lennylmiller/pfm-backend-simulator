# Database Specification
## pfm-backend-simulator Complete Schema Design

**Date**: 2025-10-04
**Purpose**: Complete database schema supporting 100% responsive-tiles compatibility
**Technology**: PostgreSQL 14+ with Prisma ORM 5.20+

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Existing Models Analysis](#existing-models-analysis)
3. [New Models Required](#new-models-required)
4. [Complete Prisma Schema](#complete-prisma-schema)
5. [Entity Relationship Diagram](#entity-relationship-diagram)
6. [Indexes and Performance](#indexes-and-performance)
7. [Migration Strategy](#migration-strategy)
8. [Data Integrity Rules](#data-integrity-rules)
9. [Sample Data](#sample-data)

---

## 1. Schema Overview

### 1.1 Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Multi-Tenant Architecture               │
│                                                               │
│  Partner (FI) ─┬─ Users ─┬─ Accounts ─── Transactions       │
│                │          ├─ Budgets                          │
│                │          ├─ Goals                            │
│                │          ├─ Alerts ─── Notifications         │
│                │          ├─ Tags                             │
│                │          ├─ CashflowBills ──┐                │
│                │          ├─ CashflowIncomes ├─ Events        │
│                │          └─ ExpenseSummaries                 │
│                │                                               │
│                └─ OAuthClients                                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Design Principles

1. **Multi-Tenancy**: All user data scoped by `partnerId` for data isolation
2. **Soft Deletes**: Use `deletedAt` timestamp for recoverable deletions
3. **Audit Trail**: `createdAt` and `updatedAt` on all models
4. **BigInt IDs**: Support for large-scale deployments (auto-increment)
5. **Decimal Precision**: Currency stored as `Decimal(12, 2)` for accuracy
6. **JSON Metadata**: Flexible metadata fields for extensibility
7. **Referential Integrity**: Cascade deletes for user-owned data

### 1.3 Model Summary

| Model | Status | Purpose | Records Expected |
|-------|--------|---------|------------------|
| Partner | ✅ Existing | Financial institution tenants | 10-1000 |
| User | ✅ Existing | End users of PFM system | 10K-10M |
| AccessToken | ✅ Existing | JWT token management | 100K-100M |
| OAuthClient | ✅ Existing | OAuth client credentials | 10-1000 |
| Account | ✅ Existing | Bank accounts | 50K-50M |
| Transaction | ✅ Existing | Financial transactions | 1M-1B+ |
| Tag | ✅ Existing | Transaction categories | 100-10K |
| Budget | ✅ Existing | Monthly budgets | 10K-10M |
| Goal | ✅ Existing | Savings/payoff goals | 10K-10M |
| Alert | ✅ Existing | User alerts configuration | 10K-10M |
| Notification | ✅ Existing | Alert notifications | 100K-100M |
| **CashflowBill** | ❌ **NEW** | Recurring bill definitions | 10K-10M |
| **CashflowIncome** | ❌ **NEW** | Recurring income definitions | 10K-10M |
| **CashflowEvent** | ❌ **NEW** | Projected cashflow events | 100K-100M |

**Total**: 14 models (11 existing + 3 new)

---

## 2. Existing Models Analysis

### 2.1 Partner Model ✅

**Purpose**: Multi-tenant isolation for financial institutions

**Schema**:
```prisma
model Partner {
  id                 BigInt    @id @default(autoincrement())
  name               String
  domain             String    @unique
  subdomain          String?
  allowPartnerApiv2  Boolean   @default(true)
  ssoEnabled         Boolean   @default(false)
  mfaRequired        Boolean   @default(false)
  logoUrl            String?
  primaryColor       String?
  secondaryColor     String?
  featureFlags       Json      @default("{}")
  settings           Json      @default("{}")
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  users              User[]
  accounts           Account[]
  oauthClients       OAuthClient[]
}
```

**Assessment**: ✅ Complete - supports branding, SSO, feature flags

### 2.2 User Model ✅

**Purpose**: End-user accounts with authentication

**Schema**:
```prisma
model User {
  id                    BigInt    @id @default(autoincrement())
  partnerId             BigInt
  email                 String?
  hashedPassword        String?
  salt                  String?
  firstName             String?
  lastName              String?
  phone                 String?
  timezone              String    @default("America/New_York")
  jwtSecret             String?
  lastLoginAt           DateTime?
  loginCount            Int       @default(0)
  preferences           Json      @default("{}")
  failedLoginAttempts   Int       @default(0)
  lockedAt              DateTime?
  otpSecret             String?
  otpRequired           Boolean   @default(false)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?

  partner               Partner   @relation(fields: [partnerId], references: [id])
  accounts              Account[]
  transactions          Transaction[]
  budgets               Budget[]
  goals                 Goal[]
  alerts                Alert[]
  accessTokens          AccessToken[]
  notifications         Notification[]

  @@unique([email, partnerId])
}
```

**Assessment**: ✅ Complete - supports auth, MFA, preferences, soft delete

**Missing Relationships** (to be added):
```prisma
  cashflowBills        CashflowBill[]      // NEW
  cashflowIncomes      CashflowIncome[]    // NEW
  cashflowEvents       CashflowEvent[]     // NEW
```

### 2.3 Account Model ✅

**Purpose**: Bank accounts (checking, savings, credit cards, etc.)

**Key Fields**:
- `accountType`: checking, savings, credit_card, loan, investment, etc.
- `balance`: Current account balance (Decimal 12,2)
- `includeInNetworth`, `includeInCashflow`, `includeInBudget`: Flags for feature inclusion
- `aggregationType`: cashedge, finicity, manual, plaid, mx
- `state`: active, inactive, archived, pending, error

**Assessment**: ✅ Complete - comprehensive account management with aggregation support

### 2.4 Transaction Model ✅

**Purpose**: Financial transactions (debits/credits)

**Key Fields**:
- `amount`: Transaction amount (Decimal 12,2) - negative for debits
- `transactionType`: debit, credit
- `postedAt`: When transaction posted
- `primaryTagId`: Category/tag reference
- `metadata`: Additional fields (tags, memo, merchant info)

**Assessment**: ✅ Complete - supports categorization, soft delete, metadata extensibility

### 2.5 Tag Model ✅

**Purpose**: Transaction categories (hierarchical)

**Key Fields**:
- `tagType`: "system" | "user" | "partner"
- `parentTagId`: For hierarchical categories
- `partnerId`, `userId`: Scope (system tags have both null)

**Assessment**: ✅ Complete - supports hierarchical categories with multi-scope

### 2.6 Budget Model ✅

**Purpose**: Monthly spending budgets by category

**Key Fields**:
- `budgetAmount`: Target amount (Decimal 12,2)
- `tagNames`: Array of category names to track
- `accountList`: Array of account IDs to include
- `recurrencePeriod`: For recurring budgets

**Assessment**: ✅ Complete - supports flexible budget rules with tag and account filtering

### 2.7 Goal Model ✅

**Purpose**: Savings and payoff goals

**Key Fields**:
- `goalType`: "savings" | "payoff"
- `targetAmount`: Goal target (0 for payoff goals)
- `currentAmount`: Current progress
- `accountId`: Linked account (optional)
- `metadata`: Stores `initialValue`, `monthlyContribution`

**Assessment**: ✅ Complete - unified model supports both goal types with metadata flexibility

### 2.8 Alert Model ✅

**Purpose**: User-configured alert rules

**Key Fields**:
- `alertType`: account_threshold, goal, merchant_name, spending_target, transaction_limit, upcoming_bill
- `sourceType`, `sourceId`: Link to related entity (account, goal, etc.)
- `conditions`: JSON with type-specific rules
- `emailDelivery`, `smsDelivery`: Notification preferences

**Assessment**: ✅ Complete - flexible alert configuration with JSON conditions

### 2.9 Notification Model ✅

**Purpose**: Alert notifications (triggered alerts)

**Key Fields**:
- `alertId`: Reference to triggering alert
- `title`, `message`: Notification content
- `read`: Read status
- `emailSent`, `smsSent`: Delivery tracking

**Assessment**: ✅ Complete - comprehensive notification tracking with delivery status

### 2.10 AccessToken & OAuthClient Models ✅

**Purpose**: Authentication and API access management

**Assessment**: ✅ Complete - standard OAuth2 implementation

---

## 3. New Models Required

### 3.1 CashflowBill Model ❌ NEW

**Purpose**: Recurring bill definitions for cashflow projection

**Requirements** (from frontend):
- User-defined recurring bills (rent, utilities, subscriptions)
- Due date (day of month 1-31)
- Recurrence pattern (monthly, biweekly, weekly)
- Category and account linking
- Active/stopped status

**Prisma Schema**:
```prisma
model CashflowBill {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  dueDate         Int       @map("due_date")              // Day of month (1-31)
  recurrence      String    @default("monthly")           // "monthly" | "biweekly" | "weekly"
  categoryId      BigInt?   @map("category_id")
  accountId       BigInt?   @map("account_id")
  active          Boolean   @default(true)
  stoppedAt       DateTime? @map("stopped_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, deletedAt, active])
  @@index([userId, dueDate])
  @@map("cashflow_bills")
}
```

**Field Definitions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | BigInt | Yes | Primary key (auto-increment) |
| userId | BigInt | Yes | User who owns this bill |
| name | String | Yes | Bill name (e.g., "Rent", "Electric Bill") |
| amount | Decimal(12,2) | Yes | Bill amount in dollars |
| dueDate | Int | Yes | Day of month (1-31) when bill is due |
| recurrence | String | Yes | "monthly", "biweekly", "weekly" |
| categoryId | BigInt | No | Tag/category reference |
| accountId | BigInt | No | Account to pay from (optional) |
| active | Boolean | Yes | Whether bill is currently active |
| stoppedAt | DateTime | No | When user stopped this bill |
| createdAt | DateTime | Yes | Record creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |
| deletedAt | DateTime | No | Soft delete timestamp |

**Business Rules**:
1. `dueDate` must be 1-31 (validated in service layer)
2. If `dueDate` > days in month, use last day of month
3. `active = false` when `stoppedAt` is set
4. Soft delete preserves historical data
5. Bills project into `CashflowEvent` records

**Sample Data**:
```sql
INSERT INTO cashflow_bills (user_id, name, amount, due_date, recurrence, category_id, active)
VALUES
  (1, 'Rent', 1200.00, 1, 'monthly', 100, true),
  (1, 'Electric Bill', 85.00, 15, 'monthly', 101, true),
  (1, 'Car Payment', 350.00, 5, 'monthly', 102, true),
  (1, 'Netflix', 15.99, 10, 'monthly', 103, true);
```

### 3.2 CashflowIncome Model ❌ NEW

**Purpose**: Recurring income definitions for cashflow projection

**Requirements** (from frontend):
- User-defined recurring income (salary, dividends, etc.)
- Receive date (day of month 1-31)
- Recurrence pattern (monthly, biweekly, weekly)
- Category and account linking
- Active/stopped status

**Prisma Schema**:
```prisma
model CashflowIncome {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  receiveDate     Int       @map("receive_date")          // Day of month (1-31)
  recurrence      String    @default("monthly")           // "monthly" | "biweekly" | "weekly"
  categoryId      BigInt?   @map("category_id")
  accountId       BigInt?   @map("account_id")
  active          Boolean   @default(true)
  stoppedAt       DateTime? @map("stopped_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, deletedAt, active])
  @@index([userId, receiveDate])
  @@map("cashflow_incomes")
}
```

**Field Definitions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | BigInt | Yes | Primary key (auto-increment) |
| userId | BigInt | Yes | User who owns this income |
| name | String | Yes | Income name (e.g., "Salary", "Freelance") |
| amount | Decimal(12,2) | Yes | Income amount in dollars |
| receiveDate | Int | Yes | Day of month (1-31) when income received |
| recurrence | String | Yes | "monthly", "biweekly", "weekly" |
| categoryId | BigInt | No | Tag/category reference |
| accountId | BigInt | No | Account to receive into (optional) |
| active | Boolean | Yes | Whether income is currently active |
| stoppedAt | DateTime | No | When user stopped this income |
| createdAt | DateTime | Yes | Record creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |
| deletedAt | DateTime | No | Soft delete timestamp |

**Business Rules**:
1. `receiveDate` must be 1-31 (validated in service layer)
2. For biweekly, use first occurrence in month then add 14 days
3. `active = false` when `stoppedAt` is set
4. Soft delete preserves historical data
5. Incomes project into `CashflowEvent` records

**Sample Data**:
```sql
INSERT INTO cashflow_incomes (user_id, name, amount, receive_date, recurrence, category_id, active)
VALUES
  (1, 'Salary', 3500.00, 15, 'biweekly', 200, true),
  (1, 'Freelance Income', 500.00, 1, 'monthly', 201, true),
  (1, 'Rental Income', 800.00, 5, 'monthly', 202, true);
```

### 3.3 CashflowEvent Model ❌ NEW

**Purpose**: Projected and actual cashflow events for timeline visualization

**Requirements** (from frontend):
- Combine bills, incomes, and transactions into unified timeline
- Support projections (future events from bills/incomes)
- Support actuals (past transactions)
- Enable event editing/deletion (user adjustments)
- Link back to source (bill, income, or transaction)

**Prisma Schema**:
```prisma
model CashflowEvent {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  sourceType      String    @map("source_type")           // "bill" | "income" | "transaction"
  sourceId        BigInt?   @map("source_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  eventDate       DateTime  @map("event_date") @db.Date
  eventType       String    @map("event_type")            // "income" | "expense"
  accountId       BigInt?   @map("account_id")
  processed       Boolean   @default(false)
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, eventDate, deletedAt])
  @@index([userId, sourceType, sourceId])
  @@index([userId, processed])
  @@map("cashflow_events")
}
```

**Field Definitions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | BigInt | Yes | Primary key (auto-increment) |
| userId | BigInt | Yes | User who owns this event |
| sourceType | String | Yes | "bill", "income", or "transaction" |
| sourceId | BigInt | No | Reference to source record (null for user-created) |
| name | String | Yes | Event description |
| amount | Decimal(12,2) | Yes | Event amount (absolute value) |
| eventDate | Date | Yes | Date when event occurs/occurred |
| eventType | String | Yes | "income" or "expense" |
| accountId | BigInt | No | Related account |
| processed | Boolean | Yes | True if actual transaction, false if projection |
| metadata | Json | Yes | Additional data (recurrence info, etc.) |
| createdAt | DateTime | Yes | Record creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |
| deletedAt | DateTime | No | Soft delete timestamp |

**Business Rules**:
1. **Projected Events** (`processed = false`):
   - Generated from active CashflowBill and CashflowIncome records
   - Regenerated on demand for date ranges
   - Can be deleted by user (marks as exception)
   - `sourceType` = "bill" or "income", `sourceId` set

2. **Actual Events** (`processed = true`):
   - Created from Transaction records
   - Immutable (reflects actual transaction)
   - `sourceType` = "transaction", `sourceId` = transaction ID
   - Cannot be deleted without deleting source transaction

3. **User-Created Events**:
   - One-off events created by user
   - `sourceType` = "bill" or "income", `sourceId` = null
   - Can be edited/deleted freely

**Event Generation Logic**:
```typescript
// Pseudo-code for event generation
async function generateCashflowEvents(
  userId: bigint,
  startDate: Date,
  endDate: Date,
  projectionDays: number = 30
): Promise<CashflowEvent[]> {
  const events: CashflowEvent[] = [];
  const projectUntil = addDays(endDate, projectionDays);

  // 1. Get bills and project forward
  const bills = await getBills(userId, { active: true });
  for (const bill of bills) {
    events.push(...projectBillEvents(bill, startDate, projectUntil));
  }

  // 2. Get incomes and project forward
  const incomes = await getIncomes(userId, { active: true });
  for (const income of incomes) {
    events.push(...projectIncomeEvents(income, startDate, projectUntil));
  }

  // 3. Get actual transactions in range
  const transactions = await getTransactions(userId, { startDate, endDate });
  for (const tx of transactions) {
    events.push(createTransactionEvent(tx));
  }

  // 4. Sort by date
  return events.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
}
```

**Sample Data**:
```sql
-- Projected bill event
INSERT INTO cashflow_events (user_id, source_type, source_id, name, amount, event_date, event_type, processed)
VALUES (1, 'bill', 1, 'Rent', 1200.00, '2025-11-01', 'expense', false);

-- Actual transaction event
INSERT INTO cashflow_events (user_id, source_type, source_id, name, amount, event_date, event_type, processed, account_id)
VALUES (1, 'transaction', 123, 'Grocery Store', 45.67, '2025-10-15', 'expense', true, 5);

-- User-created one-off event
INSERT INTO cashflow_events (user_id, source_type, source_id, name, amount, event_date, event_type, processed)
VALUES (1, 'expense', NULL, 'Car Repair', 350.00, '2025-10-20', 'expense', false);
```

---

## 4. Complete Prisma Schema

### 4.1 Full Schema with New Models

```prisma
// PFM Backend Simulator - Complete Prisma Schema
// Database: PostgreSQL 14+
// ORM: Prisma 5.20+

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =============================================================================
// ENUMS
// =============================================================================

enum AccountType {
  checking
  savings
  credit_card
  loan
  investment
  mortgage
  line_of_credit
  other
}

enum AccountState {
  active
  inactive
  archived
  pending
  error
}

enum AggregationType {
  cashedge
  finicity
  manual
  plaid
  mx
}

enum AlertType {
  account_threshold
  goal
  merchant_name
  spending_target
  transaction_limit
  upcoming_bill
}

enum GoalType {
  savings
  payoff
}

enum TransactionType {
  debit
  credit
}

// =============================================================================
// CORE MODELS
// =============================================================================

model Partner {
  id                 BigInt    @id @default(autoincrement())
  name               String
  domain             String    @unique
  subdomain          String?
  allowPartnerApiv2  Boolean   @default(true) @map("allow_partner_apiv2")
  ssoEnabled         Boolean   @default(false) @map("sso_enabled")
  mfaRequired        Boolean   @default(false) @map("mfa_required")
  logoUrl            String?   @map("logo_url")
  primaryColor       String?   @map("primary_color")
  secondaryColor     String?   @map("secondary_color")
  featureFlags       Json      @default("{}") @map("feature_flags")
  settings           Json      @default("{}")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  users              User[]
  accounts           Account[]
  oauthClients       OAuthClient[]

  @@map("partners")
}

model User {
  id                    BigInt    @id @default(autoincrement())
  partnerId             BigInt    @map("partner_id")
  email                 String?
  hashedPassword        String?   @map("hashed_password")
  salt                  String?
  firstName             String?   @map("first_name")
  lastName              String?   @map("last_name")
  phone                 String?
  timezone              String    @default("America/New_York")
  jwtSecret             String?   @map("jwt_secret")
  lastLoginAt           DateTime? @map("last_login_at")
  loginCount            Int       @default(0) @map("login_count")
  preferences           Json      @default("{}")
  failedLoginAttempts   Int       @default(0) @map("failed_login_attempts")
  lockedAt              DateTime? @map("locked_at")
  otpSecret             String?   @map("otp_secret")
  otpRequired           Boolean   @default(false) @map("otp_required")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  deletedAt             DateTime? @map("deleted_at")

  partner               Partner         @relation(fields: [partnerId], references: [id])
  accounts              Account[]
  transactions          Transaction[]
  budgets               Budget[]
  goals                 Goal[]
  alerts                Alert[]
  accessTokens          AccessToken[]
  notifications         Notification[]
  cashflowBills         CashflowBill[]
  cashflowIncomes       CashflowIncome[]
  cashflowEvents        CashflowEvent[]

  @@unique([email, partnerId])
  @@map("users")
}

model AccessToken {
  id          BigInt    @id @default(autoincrement())
  userId      BigInt    @map("user_id")
  token       String    @unique
  expiresAt   DateTime  @map("expires_at")
  revokedAt   DateTime? @map("revoked_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("access_tokens")
}

model OAuthClient {
  id            BigInt    @id @default(autoincrement())
  partnerId     BigInt    @map("partner_id")
  clientId      String    @unique @map("client_id")
  clientSecret  String    @map("client_secret")
  name          String
  redirectUris  String[]  @map("redirect_uris")
  scopes        String[]  @default(["read", "write"])
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  partner       Partner   @relation(fields: [partnerId], references: [id], onDelete: Cascade)

  @@map("oauth_clients")
}

model Account {
  id                              BigInt          @id @default(autoincrement())
  userId                          BigInt          @map("user_id")
  partnerId                       BigInt          @map("partner_id")
  ceFiId                          BigInt?         @map("ce_fi_id")
  name                            String
  displayName                     String?         @map("display_name")
  number                          String?
  referenceId                     String?         @map("reference_id")
  ceAccountId                     String?         @map("ce_account_id")
  ceAccountLoginId                String?         @map("ce_account_login_id")
  accountType                     AccountType     @default(checking) @map("account_type")
  displayAccountType              AccountType     @default(checking) @map("display_account_type")
  aggregationType                 AggregationType @default(cashedge) @map("aggregation_type")
  aggregationSubtype              String?         @map("aggregation_subtype")
  balance                         Decimal         @default(0.00) @db.Decimal(12, 2)
  lockedBalance                   Decimal         @default(0.00) @map("locked_balance") @db.Decimal(12, 2)
  preferredBalanceType            String?         @map("preferred_balance_type")
  balanceType                     String?         @map("balance_type")
  state                           AccountState    @default(active)
  description                     String?
  includeInNetworth               Boolean         @default(true) @map("include_in_networth")
  includeInCashflow               Boolean         @default(true) @map("include_in_cashflow")
  includeInExpenses               Boolean         @default(true) @map("include_in_expenses")
  includeInBudget                 Boolean         @default(true) @map("include_in_budget")
  includeInGoals                  Boolean         @default(true) @map("include_in_goals")
  includeInDashboard              Boolean         @default(true) @map("include_in_dashboard")
  queueForHarvest                 Boolean         @default(false) @map("queue_for_harvest")
  harvestMessage                  String?         @map("harvest_message")
  harvestUpdatedAt                DateTime?       @map("harvest_updated_at")
  missingCount                    Int             @default(0) @map("missing_count")
  latestTransactionReferenceId    String?         @map("latest_transaction_reference_id")
  latestTransactionPostedAt       DateTime?       @map("latest_transaction_posted_at")
  oldestTransactionPostedAt       DateTime?       @map("oldest_transaction_posted_at")
  ordering                        Int             @default(0)
  uiExperience                    String          @default("pfm") @map("ui_experience")
  ceMisc                          String?         @map("ce_misc")
  createdAt                       DateTime        @default(now()) @map("created_at")
  updatedAt                       DateTime        @updatedAt @map("updated_at")
  archivedAt                      DateTime?       @map("archived_at")

  user                            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  partner                         Partner         @relation(fields: [partnerId], references: [id])
  transactions                    Transaction[]

  @@unique([userId, ceAccountLoginId])
  @@map("accounts")
}

model Transaction {
  id                      BigInt          @id @default(autoincrement())
  userId                  BigInt          @map("user_id")
  accountId               BigInt          @map("account_id")
  referenceId             String?         @map("reference_id")
  externalTransactionId   String?         @map("external_transaction_id")
  nickname                String?
  description             String?
  originalDescription     String?         @map("original_description")
  merchantName            String?         @map("merchant_name")
  amount                  Decimal         @db.Decimal(12, 2)
  balance                 Decimal?        @db.Decimal(12, 2)
  transactionType         TransactionType? @map("transaction_type")
  postedAt                DateTime        @map("posted_at")
  transactedAt            DateTime?       @map("transacted_at")
  primaryTagId            BigInt?         @map("primary_tag_id")
  checkNumber             String?         @map("check_number")
  metadata                Json            @default("{}")
  createdAt               DateTime        @default(now()) @map("created_at")
  updatedAt               DateTime        @updatedAt @map("updated_at")
  deletedAt               DateTime?       @map("deleted_at")

  user                    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  account                 Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([userId, postedAt, deletedAt])
  @@index([accountId, postedAt])
  @@index([userId, primaryTagId])
  @@map("transactions")
}

model Tag {
  id           BigInt    @id @default(autoincrement())
  partnerId    BigInt?   @map("partner_id")
  userId       BigInt?   @map("user_id")
  name         String
  parentTagId  BigInt?   @map("parent_tag_id")
  icon         String?
  color        String?
  tagType      String    @default("user") @map("tag_type")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@index([userId, tagType])
  @@index([partnerId, tagType])
  @@map("tags")
}

model Budget {
  id                BigInt    @id @default(autoincrement())
  userId            BigInt    @map("user_id")
  name              String
  budgetAmount      Decimal   @map("budget_amount") @db.Decimal(12, 2)
  tagNames          String[]  @default([]) @map("tag_names")
  accountList       BigInt[]  @default([]) @map("account_list")
  showOnDashboard   Boolean   @default(true) @map("show_on_dashboard")
  startDate         DateTime? @map("start_date") @db.Date
  endDate           DateTime? @map("end_date") @db.Date
  recurrencePeriod  String?   @map("recurrence_period")
  other             Json      @default("{}")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  deletedAt         DateTime? @map("deleted_at")

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, deletedAt])
  @@map("budgets")
}

model Goal {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  goalType        GoalType  @map("goal_type")
  name            String
  description     String?
  targetAmount    Decimal   @map("target_amount") @db.Decimal(12, 2)
  currentAmount   Decimal   @default(0.00) @map("current_amount") @db.Decimal(12, 2)
  accountId       BigInt?   @map("account_id")
  targetDate      DateTime? @map("target_date") @db.Date
  recurring       Boolean   @default(false)
  imageUrl        String?   @map("image_url")
  icon            String?
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  archivedAt      DateTime? @map("archived_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, goalType, deletedAt])
  @@index([userId, archivedAt])
  @@map("goals")
}

model Alert {
  id                BigInt    @id @default(autoincrement())
  userId            BigInt    @map("user_id")
  alertType         AlertType @map("alert_type")
  name              String
  sourceType        String?   @map("source_type")
  sourceId          BigInt?   @map("source_id")
  conditions        Json      @default("{}")
  emailDelivery     Boolean   @default(true) @map("email_delivery")
  smsDelivery       Boolean   @default(false) @map("sms_delivery")
  active            Boolean   @default(true)
  lastTriggeredAt   DateTime? @map("last_triggered_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  deletedAt         DateTime? @map("deleted_at")

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, alertType, active, deletedAt])
  @@index([userId, sourceType, sourceId])
  @@map("alerts")
}

model Notification {
  id          BigInt    @id @default(autoincrement())
  userId      BigInt    @map("user_id")
  alertId     BigInt?   @map("alert_id")
  alertType   String    @map("alert_type")
  title       String
  message     String    @db.Text
  read        Boolean   @default(false)
  readAt      DateTime? @map("read_at")
  emailSent   Boolean   @default(false) @map("email_sent")
  emailSentAt DateTime? @map("email_sent_at")
  smsSent     Boolean   @default(false) @map("sms_sent")
  smsSentAt   DateTime? @map("sms_sent_at")
  metadata    Json      @default("{}")
  createdAt   DateTime  @default(now()) @map("created_at")
  deletedAt   DateTime? @map("deleted_at")

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read, deletedAt])
  @@index([userId, createdAt])
  @@map("notifications")
}

// =============================================================================
// CASHFLOW MODELS (NEW)
// =============================================================================

model CashflowBill {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  dueDate         Int       @map("due_date")              // 1-31
  recurrence      String    @default("monthly")           // "monthly" | "biweekly" | "weekly"
  categoryId      BigInt?   @map("category_id")
  accountId       BigInt?   @map("account_id")
  active          Boolean   @default(true)
  stoppedAt       DateTime? @map("stopped_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, deletedAt, active])
  @@index([userId, dueDate])
  @@map("cashflow_bills")
}

model CashflowIncome {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  receiveDate     Int       @map("receive_date")          // 1-31
  recurrence      String    @default("monthly")           // "monthly" | "biweekly" | "weekly"
  categoryId      BigInt?   @map("category_id")
  accountId       BigInt?   @map("account_id")
  active          Boolean   @default(true)
  stoppedAt       DateTime? @map("stopped_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, deletedAt, active])
  @@index([userId, receiveDate])
  @@map("cashflow_incomes")
}

model CashflowEvent {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  sourceType      String    @map("source_type")           // "bill" | "income" | "transaction"
  sourceId        BigInt?   @map("source_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  eventDate       DateTime  @map("event_date") @db.Date
  eventType       String    @map("event_type")            // "income" | "expense"
  accountId       BigInt?   @map("account_id")
  processed       Boolean   @default(false)
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, eventDate, deletedAt])
  @@index([userId, sourceType, sourceId])
  @@index([userId, processed])
  @@map("cashflow_events")
}
```

---

## 5. Entity Relationship Diagram

### 5.1 Complete ERD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PFM Backend Simulator - ERD                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Partner    │ 1
│──────────────│───────┐
│ id (PK)      │       │
│ name         │       │ Many
│ domain       │       ├──────────┐
│ settings     │       │          │
└──────────────┘       │          ▼
                       │    ┌──────────────┐
                       │    │     User     │ 1
                       │    │──────────────│──────┬──────┬──────┬──────┬──────┬──────┐
                       │    │ id (PK)      │      │      │      │      │      │      │
                       │    │ partnerId(FK)│      │      │      │      │      │      │
                       │    │ email        │      │      │      │      │      │      │
                       │    │ preferences  │      │      │      │      │      │      │
                       │    └──────────────┘      │      │      │      │      │      │
                       │                          │      │      │      │      │      │
                       │ Many                     │Many  │Many  │Many  │Many  │Many  │Many
                       │                          │      │      │      │      │      │
                       ▼                          ▼      ▼      ▼      ▼      ▼      ▼
              ┌──────────────┐        ┌──────────────┐ ┌────────┐ ┌──────┐ ┌──────────────┐
              │   Account    │        │ Transaction  │ │ Budget │ │ Goal │ │    Alert     │
              │──────────────│ 1      │──────────────│ │────────│ │──────│ │──────────────│
              │ id (PK)      │────┐   │ id (PK)      │ │id (PK) │ │id(PK)│ │ id (PK)      │
              │ userId (FK)  │    │   │ userId (FK)  │ │userId  │ │userId│ │ userId (FK)  │
              │ partnerId(FK)│    │   │ accountId(FK)│ │tags[]  │ │type  │ │ alertType    │
              │ balance      │    │   │ amount       │ │amount  │ │target│ │ conditions   │
              │ accountType  │    │   │ primaryTagId │ └────────┘ └──────┘ └──────────────┘
              └──────────────┘    │   │ postedAt     │                              │
                                  │   └──────────────┘                              │
                                  │                                                 │
                                  │Many                                          1  │
                                  │                                                 │
                                  │                                                 ▼
                                  │                                      ┌───────────────┐
                                  │                                      │ Notification  │
                                  │                                      │───────────────│
                                  │                                      │ id (PK)       │
                                  │                                      │ userId (FK)   │
                                  │                                      │ alertId (FK)  │
                                  │                                      │ title         │
                                  │                                      │ message       │
                                  │                                      └───────────────┘

┌──────────────────┐         ┌───────────────────┐         ┌──────────────────┐
│  CashflowBill    │         │  CashflowIncome   │         │  CashflowEvent   │
│──────────────────│         │───────────────────│         │──────────────────│
│ id (PK)          │         │ id (PK)           │         │ id (PK)          │
│ userId (FK)      │────┐    │ userId (FK)       │────┐    │ userId (FK)      │
│ name             │    │    │ name              │    │    │ sourceType       │
│ amount           │    │    │ amount            │    │    │ sourceId         │
│ dueDate (1-31)   │    │    │ receiveDate(1-31) │    │    │ name             │
│ recurrence       │    │    │ recurrence        │    │    │ amount           │
│ active           │    │    │ active            │    │    │ eventDate        │
└──────────────────┘    │    └───────────────────┘    │    │ eventType        │
         │              │              │               │    │ processed        │
         │              │              │               │    └──────────────────┘
         │              │              │               │              ▲
         │              └──────────────┼───────────────┘              │
         │                             │                              │
         └─────────────────────────────┴──────────────────────────────┘
                        Projects Into Events
```

### 5.2 Relationship Summary

| Parent Model | Child Model | Relationship | Cascade Delete |
|--------------|-------------|--------------|----------------|
| Partner | User | 1:N | No |
| Partner | Account | 1:N | No |
| User | Account | 1:N | Yes |
| User | Transaction | 1:N | Yes |
| User | Budget | 1:N | Yes |
| User | Goal | 1:N | Yes |
| User | Alert | 1:N | Yes |
| User | Notification | 1:N | Yes |
| User | CashflowBill | 1:N | Yes |
| User | CashflowIncome | 1:N | Yes |
| User | CashflowEvent | 1:N | Yes |
| Account | Transaction | 1:N | Yes |
| Alert | Notification | 1:N | No |

---

## 6. Indexes and Performance

### 6.1 Critical Indexes

**Transaction Queries** (most frequent):
```sql
CREATE INDEX idx_transactions_user_posted ON transactions(user_id, posted_at, deleted_at);
CREATE INDEX idx_transactions_account_posted ON transactions(account_id, posted_at);
CREATE INDEX idx_transactions_user_tag ON transactions(user_id, primary_tag_id);
```

**Cashflow Queries**:
```sql
CREATE INDEX idx_cashflow_bills_user_active ON cashflow_bills(user_id, deleted_at, active);
CREATE INDEX idx_cashflow_bills_user_date ON cashflow_bills(user_id, due_date);
CREATE INDEX idx_cashflow_incomes_user_active ON cashflow_incomes(user_id, deleted_at, active);
CREATE INDEX idx_cashflow_incomes_user_date ON cashflow_incomes(user_id, receive_date);
CREATE INDEX idx_cashflow_events_user_date ON cashflow_events(user_id, event_date, deleted_at);
CREATE INDEX idx_cashflow_events_source ON cashflow_events(user_id, source_type, source_id);
CREATE INDEX idx_cashflow_events_processed ON cashflow_events(user_id, processed);
```

**Goal Queries**:
```sql
CREATE INDEX idx_goals_user_type ON goals(user_id, goal_type, deleted_at);
CREATE INDEX idx_goals_user_archived ON goals(user_id, archived_at);
```

**Alert Queries**:
```sql
CREATE INDEX idx_alerts_user_type ON alerts(user_id, alert_type, active, deleted_at);
CREATE INDEX idx_alerts_source ON alerts(user_id, source_type, source_id);
```

**Notification Queries**:
```sql
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read, deleted_at);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);
```

**Budget Queries**:
```sql
CREATE INDEX idx_budgets_user ON budgets(user_id, deleted_at);
```

**Tag Queries**:
```sql
CREATE INDEX idx_tags_user_type ON tags(user_id, tag_type);
CREATE INDEX idx_tags_partner_type ON tags(partner_id, tag_type);
```

### 6.2 Performance Considerations

**Query Patterns**:

1. **Transaction List by Date Range** (most common):
   ```sql
   SELECT * FROM transactions
   WHERE user_id = $1
     AND posted_at BETWEEN $2 AND $3
     AND deleted_at IS NULL
   ORDER BY posted_at DESC
   LIMIT 50;
   ```
   - Uses: `idx_transactions_user_posted`
   - Expected: <10ms

2. **Budget Calculation** (monthly aggregation):
   ```sql
   SELECT SUM(ABS(amount)) FROM transactions
   WHERE user_id = $1
     AND primary_tag_id = ANY($2)
     AND account_id = ANY($3)
     AND posted_at BETWEEN $4 AND $5
     AND deleted_at IS NULL;
   ```
   - Uses: `idx_transactions_user_tag` or `idx_transactions_user_posted`
   - Expected: <50ms

3. **Cashflow Event Generation** (projection):
   ```sql
   -- Get active bills
   SELECT * FROM cashflow_bills
   WHERE user_id = $1
     AND active = true
     AND deleted_at IS NULL;

   -- Get active incomes
   SELECT * FROM cashflow_incomes
   WHERE user_id = $1
     AND active = true
     AND deleted_at IS NULL;
   ```
   - Uses: `idx_cashflow_bills_user_active`, `idx_cashflow_incomes_user_active`
   - Expected: <10ms each

### 6.3 Partitioning Strategy (Future)

For very large deployments (>100M transactions):

```sql
-- Partition transactions by month
CREATE TABLE transactions (
  ...
) PARTITION BY RANGE (posted_at);

CREATE TABLE transactions_2025_10 PARTITION OF transactions
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE transactions_2025_11 PARTITION OF transactions
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

---

## 7. Migration Strategy

### 7.1 Migration Plan

**Phase 1: Schema Migration**
```bash
# Create migration for new models
npx prisma migrate dev --name add_cashflow_models

# This generates:
# - prisma/migrations/YYYYMMDDHHMMSS_add_cashflow_models/migration.sql
```

**Generated SQL** (approximate):
```sql
-- CreateTable
CREATE TABLE "cashflow_bills" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" INTEGER NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'monthly',
    "category_id" BIGINT,
    "account_id" BIGINT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stopped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "cashflow_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashflow_incomes" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receive_date" INTEGER NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'monthly',
    "category_id" BIGINT,
    "account_id" BIGINT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stopped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "cashflow_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashflow_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" BIGINT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "event_date" DATE NOT NULL,
    "event_type" TEXT NOT NULL,
    "account_id" BIGINT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "cashflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cashflow_bills_user_id_deleted_at_active_idx"
  ON "cashflow_bills"("user_id", "deleted_at", "active");

CREATE INDEX "cashflow_bills_user_id_due_date_idx"
  ON "cashflow_bills"("user_id", "due_date");

CREATE INDEX "cashflow_incomes_user_id_deleted_at_active_idx"
  ON "cashflow_incomes"("user_id", "deleted_at", "active");

CREATE INDEX "cashflow_incomes_user_id_receive_date_idx"
  ON "cashflow_incomes"("user_id", "receive_date");

CREATE INDEX "cashflow_events_user_id_event_date_deleted_at_idx"
  ON "cashflow_events"("user_id", "event_date", "deleted_at");

CREATE INDEX "cashflow_events_user_id_source_type_source_id_idx"
  ON "cashflow_events"("user_id", "source_type", "source_id");

CREATE INDEX "cashflow_events_user_id_processed_idx"
  ON "cashflow_events"("user_id", "processed");

-- AddForeignKey
ALTER TABLE "cashflow_bills" ADD CONSTRAINT "cashflow_bills_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cashflow_incomes" ADD CONSTRAINT "cashflow_incomes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cashflow_events" ADD CONSTRAINT "cashflow_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Phase 2: Update Existing Models**
```sql
-- Add alertType to Notification (if not present)
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "alert_type" TEXT DEFAULT 'account_threshold';
```

### 7.2 Rollback Plan

```sql
-- Rollback cashflow models
DROP TABLE IF EXISTS "cashflow_events" CASCADE;
DROP TABLE IF EXISTS "cashflow_incomes" CASCADE;
DROP TABLE IF EXISTS "cashflow_bills" CASCADE;
```

### 7.3 Migration Commands

```bash
# 1. Create migration
npx prisma migrate dev --name add_cashflow_models

# 2. Apply to production (after testing)
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. Verify schema
npx prisma validate
```

---

## 8. Data Integrity Rules

### 8.1 Constraints

**Foreign Key Constraints**:
- All user-owned models cascade delete when user deleted
- Partner relationships do not cascade (prevent accidental data loss)

**Check Constraints** (to be enforced in service layer):
```typescript
// CashflowBill validation
if (dueDate < 1 || dueDate > 31) {
  throw new Error('dueDate must be between 1 and 31');
}

if (!['monthly', 'biweekly', 'weekly'].includes(recurrence)) {
  throw new Error('Invalid recurrence value');
}

// CashflowIncome validation
if (receiveDate < 1 || receiveDate > 31) {
  throw new Error('receiveDate must be between 1 and 31');
}

// CashflowEvent validation
if (!['bill', 'income', 'transaction'].includes(sourceType)) {
  throw new Error('Invalid sourceType');
}

if (!['income', 'expense'].includes(eventType)) {
  throw new Error('Invalid eventType');
}

// Amount must be positive
if (amount.lte(0)) {
  throw new Error('amount must be greater than 0');
}
```

### 8.2 Soft Delete Rules

**All user data supports soft delete**:
- Set `deletedAt` timestamp instead of physical delete
- Queries must filter `WHERE deletedAt IS NULL`
- Restore by setting `deletedAt = NULL`
- Physical deletion only via admin tools

**Cascade Behavior**:
- When User soft-deleted: All user data remains (orphaned but queryable)
- When Account deleted: Transactions remain (for audit trail)
- When Alert deleted: Notifications remain (for history)

### 8.3 Unique Constraints

```prisma
@@unique([email, partnerId])  // User: email unique per partner
@@unique([userId, ceAccountLoginId])  // Account: external ID unique per user
```

---

## 9. Sample Data

### 9.1 Test Data Script

```sql
-- Sample Partner
INSERT INTO partners (id, name, domain, allow_partner_apiv2, created_at, updated_at)
VALUES (1, 'Demo Bank', 'demo.bank', true, NOW(), NOW());

-- Sample User
INSERT INTO users (id, partner_id, email, first_name, last_name, timezone, created_at, updated_at)
VALUES (1, 1, 'john.doe@demo.bank', 'John', 'Doe', 'America/New_York', NOW(), NOW());

-- Sample Accounts
INSERT INTO accounts (id, user_id, partner_id, name, display_name, account_type, balance, state, created_at, updated_at)
VALUES
  (1, 1, 1, 'Primary Checking', 'Checking', 'checking', 2500.00, 'active', NOW(), NOW()),
  (2, 1, 1, 'Savings Account', 'Savings', 'savings', 10000.00, 'active', NOW(), NOW()),
  (3, 1, 1, 'Credit Card', 'Visa', 'credit_card', -1500.00, 'active', NOW(), NOW());

-- Sample Tags
INSERT INTO tags (id, name, tag_type, created_at, updated_at)
VALUES
  (1, 'Groceries', 'system', NOW(), NOW()),
  (2, 'Dining', 'system', NOW(), NOW()),
  (3, 'Utilities', 'system', NOW(), NOW()),
  (4, 'Entertainment', 'system', NOW(), NOW()),
  (5, 'Transportation', 'system', NOW(), NOW());

-- Sample Transactions
INSERT INTO transactions (user_id, account_id, description, amount, transaction_type, posted_at, primary_tag_id, created_at, updated_at)
VALUES
  (1, 1, 'Whole Foods', -87.43, 'debit', NOW() - INTERVAL '2 days', 1, NOW(), NOW()),
  (1, 1, 'Shell Gas Station', -42.00, 'debit', NOW() - INTERVAL '3 days', 5, NOW(), NOW()),
  (1, 1, 'Paycheck Deposit', 3500.00, 'credit', NOW() - INTERVAL '5 days', NULL, NOW(), NOW());

-- Sample Budget
INSERT INTO budgets (user_id, name, budget_amount, tag_names, show_on_dashboard, created_at, updated_at)
VALUES (1, 'Groceries', 500.00, ARRAY['Groceries'], true, NOW(), NOW());

-- Sample Goals
INSERT INTO goals (user_id, goal_type, name, target_amount, current_amount, account_id, target_date, created_at, updated_at)
VALUES
  (1, 'payoff', 'Pay off credit card', 0.00, 1500.00, 3, NOW() + INTERVAL '1 year', NOW(), NOW()),
  (1, 'savings', 'Emergency Fund', 10000.00, 5000.00, 2, NOW() + INTERVAL '2 years', NOW(), NOW());

-- Sample Cashflow Bills
INSERT INTO cashflow_bills (user_id, name, amount, due_date, recurrence, category_id, active, created_at, updated_at)
VALUES
  (1, 'Rent', 1200.00, 1, 'monthly', 3, true, NOW(), NOW()),
  (1, 'Electric Bill', 85.00, 15, 'monthly', 3, true, NOW(), NOW()),
  (1, 'Car Payment', 350.00, 5, 'monthly', 5, true, NOW(), NOW());

-- Sample Cashflow Incomes
INSERT INTO cashflow_incomes (user_id, name, amount, receive_date, recurrence, active, created_at, updated_at)
VALUES
  (1, 'Salary', 1750.00, 15, 'biweekly', true, NOW(), NOW());

-- Sample Alert
INSERT INTO alerts (user_id, alert_type, name, source_type, source_id, conditions, email_delivery, active, created_at, updated_at)
VALUES (1, 'account_threshold', 'Low Balance Warning', 'account', 1, '{"threshold": "100.00", "comparison": "less_than"}', true, true, NOW(), NOW());
```

---

## 10. Summary

### 10.1 Implementation Checklist

- [ ] **Update Prisma Schema** with 3 new models
  - [ ] Add CashflowBill model
  - [ ] Add CashflowIncome model
  - [ ] Add CashflowEvent model
  - [ ] Add relationships to User model

- [ ] **Run Migrations**
  - [ ] Create migration: `npx prisma migrate dev --name add_cashflow_models`
  - [ ] Test migration in development
  - [ ] Review generated SQL
  - [ ] Apply to staging: `npx prisma migrate deploy`
  - [ ] Verify schema: `npx prisma validate`

- [ ] **Generate Prisma Client**
  - [ ] Run: `npx prisma generate`
  - [ ] Verify types in `@prisma/client`

- [ ] **Create Seed Data**
  - [ ] Sample bills
  - [ ] Sample incomes
  - [ ] Test event generation

- [ ] **Update Services**
  - [ ] CashflowBill CRUD service
  - [ ] CashflowIncome CRUD service
  - [ ] CashflowEvent generation service
  - [ ] Event projection logic

- [ ] **Add Indexes** (if not auto-created by Prisma)
  - [ ] Verify index creation in migration
  - [ ] Test query performance
  - [ ] Add manual indexes if needed

### 10.2 Key Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Migration Time | <5 seconds | Empty database |
| Index Creation | <10 seconds | First 3 tables |
| Query Performance (Transactions) | <10ms | With 10K records |
| Query Performance (Cashflow) | <50ms | With 1K bills/incomes |
| Event Generation | <200ms | 30-day projection |

### 10.3 Next Steps

1. **Implement Database Changes**
   - Update `prisma/schema.prisma` with new models
   - Run `npx prisma migrate dev`
   - Verify migration success

2. **Create Service Layer**
   - Implement CashflowBill service (CRUD)
   - Implement CashflowIncome service (CRUD)
   - Implement CashflowEvent service (generation & management)

3. **Build Controllers**
   - Create cashflow routes
   - Implement bill/income endpoints
   - Implement event endpoints

4. **Write Tests**
   - Unit tests for services
   - Integration tests for API endpoints
   - Performance tests for event generation

5. **Documentation**
   - API documentation for new endpoints
   - Service documentation for event generation
   - Migration guide for production deployment

**Database design is complete and ready for implementation.**
