# PFM Backend Simulator - Implementation Plan

**Project Name**: `pfm-backend-simulator`
**Purpose**: Lightweight backend to simulate Geezeo PFM API for responsive-tiles development/testing
**Created**: 2025-09-30
**Based on**: API dependencies research + PostgreSQL schema design

---

## Executive Summary

Create a minimal, standalone Node.js/Express backend that implements the 135+ API endpoints required by responsive-tiles, backed by PostgreSQL. Include migration tools to seed data from existing Geezeo MySQL database or generate realistic test data.

**Goals**:
1. ✅ Simulate all `/api/v2` endpoints needed by responsive-tiles
2. ✅ Use PostgreSQL schema (already designed)
3. ✅ Provide data migration tool from existing Geezeo MySQL
4. ✅ Generate realistic test data when migration not available
5. ✅ Lightweight, easy to run locally for development

**Non-Goals**:
- Full Geezeo feature parity (only responsive-tiles endpoints)
- Production-ready security (development/testing focus)
- Complex business logic (simple CRUD with realistic responses)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PFM Backend Simulator                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │      Node.js/Express REST API          │
         │      (Implements /api/v2/*)            │
         └────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Auth         │  │ Accounts     │  │ Transactions │
    │ Middleware   │  │ Budgets      │  │ Goals        │
    │ (JWT/OAuth)  │  │ Cashflow     │  │ Alerts       │
    └──────────────┘  └──────────────┘  └──────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │    PostgreSQL Database        │
              │ (Schema from design phase)    │
              └───────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌─────────────────┐   ┌─────────────────┐
        │ Migration Tool  │   │ Seed Data Gen   │
        │ (MySQL → PG)    │   │ (Faker.js)      │
        └─────────────────┘   └─────────────────┘
```

---

## Technology Stack

### Backend API
- **Runtime**: Node.js 20+ (LTS)
- **Framework**: Express.js 4.x (simple, lightweight)
- **Database**: PostgreSQL 14+ (using designed schema)
- **ORM**: Prisma 5.x (type-safe, excellent PostgreSQL support)
- **Auth**: jsonwebtoken (JWT), bcrypt (passwords)
- **Validation**: Zod (type-safe validation)
- **Logging**: Pino (fast, structured logging)
- **Testing**: Jest + Supertest

### Migration & Seeding
- **MySQL Client**: mysql2 (for reading existing Geezeo DB)
- **Data Generation**: @faker-js/faker (realistic test data)
- **CLI Framework**: Commander.js
- **Progress Tracking**: cli-progress

### Development Tools
- **TypeScript**: Full type safety
- **Nodemon**: Auto-reload during development
- **ESLint + Prettier**: Code quality
- **Docker Compose**: Local PostgreSQL + API

---

## Project Structure

```
pfm-backend-simulator/
├── package.json
├── tsconfig.json
├── .env.example
├── docker-compose.yml
├── README.md
│
├── prisma/
│   ├── schema.prisma           # Prisma schema from PostgreSQL design
│   ├── migrations/              # Database migrations
│   └── seed.ts                  # Initial data seeding
│
├── src/
│   ├── index.ts                 # Application entry point
│   ├── config/
│   │   ├── database.ts          # Prisma client setup
│   │   ├── auth.ts              # JWT configuration
│   │   └── logger.ts            # Pino logger setup
│   │
│   ├── middleware/
│   │   ├── auth.ts              # JWT/OAuth middleware
│   │   ├── errorHandler.ts     # Global error handling
│   │   ├── validator.ts         # Request validation
│   │   └── logging.ts           # Request logging
│   │
│   ├── routes/
│   │   ├── index.ts             # Route aggregator
│   │   ├── auth.ts              # /oauth/tokens, session endpoints
│   │   ├── users.ts             # /users/*, /partners/current
│   │   ├── accounts.ts          # /users/{userId}/accounts/*
│   │   ├── transactions.ts      # /users/{userId}/transactions/*
│   │   ├── budgets.ts           # /users/{userId}/budgets/*
│   │   ├── goals.ts             # /users/{userId}/{type}_goals/*
│   │   ├── cashflow.ts          # /users/{userId}/cashflow/*
│   │   ├── alerts.ts            # /users/{userId}/alerts/*
│   │   ├── tags.ts              # /tags, /users/{userId}/tags
│   │   ├── cashedge.ts          # /ce_fis/*, aggregation endpoints
│   │   ├── networth.ts          # /users/{userId}/networth/*
│   │   ├── expenses.ts          # /users/{userId}/expenses
│   │   ├── notifications.ts     # /users/{userId}/alerts/notifications/*
│   │   ├── harvests.ts          # /users/{userId}/harvest
│   │   ├── tickets.ts           # /users/{userId}/tickets
│   │   ├── ads.ts               # /users/{userId}/ads
│   │   └── finicity.ts          # /users/{userId}/aggregation/finicity/*
│   │
│   ├── controllers/
│   │   ├── accountsController.ts
│   │   ├── transactionsController.ts
│   │   ├── budgetsController.ts
│   │   ├── goalsController.ts
│   │   ├── cashflowController.ts
│   │   ├── alertsController.ts
│   │   └── ... (one per domain)
│   │
│   ├── services/
│   │   ├── accountService.ts    # Business logic layer
│   │   ├── transactionService.ts
│   │   ├── budgetService.ts
│   │   ├── goalService.ts
│   │   └── ... (one per domain)
│   │
│   ├── types/
│   │   ├── auth.ts              # Auth-related types
│   │   ├── api.ts               # API request/response types
│   │   └── models.ts            # Domain model types
│   │
│   └── utils/
│       ├── pagination.ts        # Pagination helpers
│       ├── date.ts              # RFC3339 date formatting
│       └── crypto.ts            # Encryption utilities
│
├── tools/
│   ├── migrate/
│   │   ├── index.ts             # Migration CLI entry
│   │   ├── mysql-reader.ts      # Read from Geezeo MySQL
│   │   ├── pg-writer.ts         # Write to PostgreSQL
│   │   ├── mapper.ts            # MySQL → PostgreSQL mapping
│   │   └── config.ts            # Migration configuration
│   │
│   └── seed/
│       ├── index.ts             # Seed CLI entry
│       ├── generators/
│       │   ├── partners.ts      # Generate partner data
│       │   ├── users.ts         # Generate user data
│       │   ├── accounts.ts      # Generate account data
│       │   ├── transactions.ts  # Generate transaction data
│       │   ├── budgets.ts       # Generate budget data
│       │   └── ... (one per domain)
│       └── scenarios.ts         # Predefined test scenarios
│
└── tests/
    ├── integration/
    │   ├── accounts.test.ts
    │   ├── transactions.test.ts
    │   └── ... (test each endpoint)
    │
    └── unit/
        ├── services/
        └── utils/
```

---

## Database Schema (Prisma)

Convert the PostgreSQL schema to Prisma format:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enums
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

// Core Models
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

  partner               Partner   @relation(fields: [partnerId], references: [id])
  accounts              Account[]
  transactions          Transaction[]
  budgets               Budget[]
  goals                 Goal[]
  alerts                Alert[]

  @@unique([email, partnerId])
  @@map("users")
}

model Account {
  id                              BigInt        @id @default(autoincrement())
  userId                          BigInt        @map("user_id")
  partnerId                       BigInt        @map("partner_id")
  ceFiId                          BigInt?       @map("ce_fi_id")
  name                            String
  displayName                     String?       @map("display_name")
  number                          String?
  referenceId                     String?       @map("reference_id")
  ceAccountId                     String?       @map("ce_account_id")
  ceAccountLoginId                String?       @map("ce_account_login_id")
  accountType                     AccountType   @default(checking) @map("account_type")
  displayAccountType              AccountType   @default(checking) @map("display_account_type")
  aggregationType                 AggregationType @default(cashedge) @map("aggregation_type")
  aggregationSubtype              String?       @map("aggregation_subtype")
  balance                         Decimal       @default(0.00) @db.Decimal(12, 2)
  lockedBalance                   Decimal       @default(0.00) @map("locked_balance") @db.Decimal(12, 2)
  preferredBalanceType            String?       @map("preferred_balance_type")
  balanceType                     String?       @map("balance_type")
  state                           AccountState  @default(active)
  description                     String?
  includeInNetworth               Boolean       @default(true) @map("include_in_networth")
  includeInCashflow               Boolean       @default(true) @map("include_in_cashflow")
  includeInExpenses               Boolean       @default(true) @map("include_in_expenses")
  includeInBudget                 Boolean       @default(true) @map("include_in_budget")
  includeInGoals                  Boolean       @default(true) @map("include_in_goals")
  includeInDashboard              Boolean       @default(true) @map("include_in_dashboard")
  queueForHarvest                 Boolean       @default(false) @map("queue_for_harvest")
  harvestMessage                  String?       @map("harvest_message")
  harvestUpdatedAt                DateTime?     @map("harvest_updated_at")
  missingCount                    Int           @default(0) @map("missing_count")
  latestTransactionReferenceId    String?       @map("latest_transaction_reference_id")
  latestTransactionPostedAt       DateTime?     @map("latest_transaction_posted_at")
  oldestTransactionPostedAt       DateTime?     @map("oldest_transaction_posted_at")
  ordering                        Int           @default(0)
  uiExperience                    String        @default("pfm") @map("ui_experience")
  ceMisc                          String?       @map("ce_misc")
  createdAt                       DateTime      @default(now()) @map("created_at")
  updatedAt                       DateTime      @updatedAt @map("updated_at")
  archivedAt                      DateTime?     @map("archived_at")

  user                            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  partner                         Partner       @relation(fields: [partnerId], references: [id])
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

  @@map("transactions")
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

  @@map("alerts")
}

// ... (remaining models following same pattern)
```

---

## API Implementation Strategy

### 1. Authentication Layer

```typescript
// src/middleware/auth.ts

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JWTPayload {
  userId: string;
  partnerId: string;
  exp: number;
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Attach to request context
    req.context = {
      userId: payload.userId,
      partnerId: payload.partnerId
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

### 2. Route Implementation Example

```typescript
// src/routes/accounts.ts

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as accountsController from '../controllers/accountsController';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// GET /users/:userId/accounts/all
router.get('/users/:userId/accounts/all', accountsController.getAllAccounts);

// GET /users/:userId/accounts/:id
router.get('/users/:userId/accounts/:id', accountsController.getAccount);

// PUT /users/:userId/accounts/:id
router.put('/users/:userId/accounts/:id', accountsController.updateAccount);

// PUT /users/:userId/accounts/:id/archive
router.put('/users/:userId/accounts/:id/archive', accountsController.archiveAccount);

// DELETE /users/:userId/accounts/:id
router.delete('/users/:userId/accounts/:id', accountsController.deleteAccount);

export default router;
```

### 3. Controller Implementation Example

```typescript
// src/controllers/accountsController.ts

import { Request, Response } from 'express';
import { accountService } from '../services/accountService';
import { logger } from '../config/logger';

export const getAllAccounts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Verify user context matches
    if (userId !== req.context.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const accounts = await accountService.getAllAccounts(userId);

    return res.json({ accounts });
  } catch (error) {
    logger.error({ error }, 'Failed to get all accounts');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccount = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    if (userId !== req.context.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const account = await accountService.getAccountById(userId, id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.json({ account });
  } catch (error) {
    logger.error({ error }, 'Failed to get account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const { account } = req.body;

    if (userId !== req.context.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await accountService.updateAccount(userId, id, account);

    return res.json({ account: updated });
  } catch (error) {
    logger.error({ error }, 'Failed to update account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

### 4. Service Layer Example

```typescript
// src/services/accountService.ts

import { prisma } from '../config/database';
import { AccountType, AccountState } from '@prisma/client';

export const accountService = {
  async getAllAccounts(userId: string) {
    return await prisma.account.findMany({
      where: {
        userId: BigInt(userId),
        archivedAt: null,
        state: AccountState.active
      },
      orderBy: {
        ordering: 'asc'
      }
    });
  },

  async getAccountById(userId: string, accountId: string) {
    return await prisma.account.findFirst({
      where: {
        id: BigInt(accountId),
        userId: BigInt(userId)
      }
    });
  },

  async updateAccount(userId: string, accountId: string, data: any) {
    return await prisma.account.update({
      where: {
        id: BigInt(accountId),
        userId: BigInt(userId)
      },
      data: {
        name: data.name,
        displayName: data.display_name,
        includeInNetworth: data.include_in_networth,
        includeInCashflow: data.include_in_cashflow,
        includeInBudget: data.include_in_budget,
        includeInGoals: data.include_in_goals,
        includeInDashboard: data.include_in_dashboard,
        updatedAt: new Date()
      }
    });
  },

  async archiveAccount(userId: string, accountId: string) {
    return await prisma.account.update({
      where: {
        id: BigInt(accountId),
        userId: BigInt(userId)
      },
      data: {
        archivedAt: new Date(),
        updatedAt: new Date()
      }
    });
  },

  async deleteAccount(userId: string, accountId: string) {
    return await prisma.account.delete({
      where: {
        id: BigInt(accountId),
        userId: BigInt(userId)
      }
    });
  }
};
```

---

## Migration Tool Design

### Tool 1: MySQL → PostgreSQL Migration

```typescript
// tools/migrate/index.ts

import { Command } from 'commander';
import { MySQLReader } from './mysql-reader';
import { PostgreSQLWriter } from './pg-writer';
import { DataMapper } from './mapper';
import { createProgressBar } from './progress';

const program = new Command();

program
  .name('pfm-migrate')
  .description('Migrate data from Geezeo MySQL to PFM Simulator PostgreSQL')
  .version('1.0.0');

program
  .command('migrate')
  .description('Run full migration from MySQL to PostgreSQL')
  .option('-s, --source <url>', 'Source MySQL connection string')
  .option('-t, --target <url>', 'Target PostgreSQL connection string')
  .option('--partner-id <id>', 'Specific partner ID to migrate')
  .option('--user-id <id>', 'Specific user ID to migrate')
  .option('--tables <tables...>', 'Specific tables to migrate (default: all)')
  .option('--dry-run', 'Preview migration without writing to database')
  .option('--batch-size <size>', 'Batch size for bulk inserts', '1000')
  .action(async (options) => {
    const mysqlReader = new MySQLReader(options.source);
    const pgWriter = new PostgreSQLWriter(options.target);
    const mapper = new DataMapper();

    console.log('Starting migration...\n');

    try {
      // 1. Migrate partners
      console.log('Migrating partners...');
      const partners = await mysqlReader.readPartners(options.partnerId);
      const mappedPartners = partners.map(mapper.mapPartner);

      if (!options.dryRun) {
        await pgWriter.writePartners(mappedPartners);
      }
      console.log(`✓ Migrated ${partners.length} partners\n`);

      // 2. Migrate users
      console.log('Migrating users...');
      const users = await mysqlReader.readUsers(options.userId, options.partnerId);
      const mappedUsers = users.map(mapper.mapUser);

      if (!options.dryRun) {
        await pgWriter.writeUsers(mappedUsers);
      }
      console.log(`✓ Migrated ${users.length} users\n`);

      // 3. Migrate accounts
      console.log('Migrating accounts...');
      const accounts = await mysqlReader.readAccounts(options.userId);
      const mappedAccounts = accounts.map(mapper.mapAccount);

      if (!options.dryRun) {
        await pgWriter.writeAccounts(mappedAccounts);
      }
      console.log(`✓ Migrated ${accounts.length} accounts\n`);

      // 4. Migrate transactions (with progress bar)
      console.log('Migrating transactions...');
      const transactionCount = await mysqlReader.countTransactions(options.userId);
      const progressBar = createProgressBar(transactionCount);

      let processed = 0;
      for await (const batch of mysqlReader.readTransactionsBatch(options.userId, options.batchSize)) {
        const mappedBatch = batch.map(mapper.mapTransaction);

        if (!options.dryRun) {
          await pgWriter.writeTransactions(mappedBatch);
        }

        processed += batch.length;
        progressBar.update(processed);
      }

      progressBar.stop();
      console.log(`✓ Migrated ${transactionCount} transactions\n`);

      // 5. Migrate budgets
      console.log('Migrating budgets...');
      const budgets = await mysqlReader.readBudgets(options.userId);
      const mappedBudgets = budgets.map(mapper.mapBudget);

      if (!options.dryRun) {
        await pgWriter.writeBudgets(mappedBudgets);
      }
      console.log(`✓ Migrated ${budgets.length} budgets\n`);

      // 6. Migrate goals
      console.log('Migrating goals...');
      const goals = await mysqlReader.readGoals(options.userId);
      const mappedGoals = goals.map(mapper.mapGoal);

      if (!options.dryRun) {
        await pgWriter.writeGoals(mappedGoals);
      }
      console.log(`✓ Migrated ${goals.length} goals\n`);

      // 7. Migrate alerts
      console.log('Migrating alerts...');
      const alerts = await mysqlReader.readAlerts(options.userId);
      const mappedAlerts = alerts.map(mapper.mapAlert);

      if (!options.dryRun) {
        await pgWriter.writeAlerts(mappedAlerts);
      }
      console.log(`✓ Migrated ${alerts.length} alerts\n`);

      console.log('Migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await mysqlReader.close();
      await pgWriter.close();
    }
  });

program.parse();
```

### MySQL Reader Implementation

```typescript
// tools/migrate/mysql-reader.ts

import mysql from 'mysql2/promise';

export class MySQLReader {
  private connection: mysql.Connection;

  constructor(connectionString: string) {
    this.connection = await mysql.createConnection(connectionString);
  }

  async readPartners(partnerId?: string): Promise<any[]> {
    const sql = partnerId
      ? 'SELECT * FROM partners WHERE id = ?'
      : 'SELECT * FROM partners';

    const [rows] = await this.connection.execute(sql, partnerId ? [partnerId] : []);
    return rows as any[];
  }

  async readUsers(userId?: string, partnerId?: string): Promise<any[]> {
    let sql = 'SELECT * FROM users WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (userId) {
      sql += ' AND id = ?';
      params.push(userId);
    }

    if (partnerId) {
      sql += ' AND partner_id = ?';
      params.push(partnerId);
    }

    const [rows] = await this.connection.execute(sql, params);
    return rows as any[];
  }

  async readAccounts(userId?: string): Promise<any[]> {
    const sql = userId
      ? 'SELECT * FROM accounts WHERE user_id = ? AND archived_at IS NULL'
      : 'SELECT * FROM accounts WHERE archived_at IS NULL';

    const [rows] = await this.connection.execute(sql, userId ? [userId] : []);
    return rows as any[];
  }

  async countTransactions(userId?: string): Promise<number> {
    const sql = userId
      ? 'SELECT COUNT(*) as count FROM transactions WHERE user_id = ? AND deleted_at IS NULL'
      : 'SELECT COUNT(*) as count FROM transactions WHERE deleted_at IS NULL';

    const [rows] = await this.connection.execute(sql, userId ? [userId] : []);
    return (rows as any)[0].count;
  }

  async *readTransactionsBatch(userId?: string, batchSize: number = 1000): AsyncGenerator<any[]> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const sql = userId
        ? 'SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL ORDER BY id LIMIT ? OFFSET ?'
        : 'SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY id LIMIT ? OFFSET ?';

      const params = userId ? [userId, batchSize, offset] : [batchSize, offset];
      const [rows] = await this.connection.execute(sql, params);

      const batch = rows as any[];

      if (batch.length === 0) {
        hasMore = false;
      } else {
        yield batch;
        offset += batchSize;
      }
    }
  }

  async readBudgets(userId?: string): Promise<any[]> {
    const sql = userId
      ? 'SELECT * FROM budgets WHERE user_id = ? AND deleted_at IS NULL'
      : 'SELECT * FROM budgets WHERE deleted_at IS NULL';

    const [rows] = await this.connection.execute(sql, userId ? [userId] : []);
    return rows as any[];
  }

  async readGoals(userId?: string): Promise<any[]> {
    const sql = userId
      ? 'SELECT * FROM savings_goals WHERE user_id = ? AND deleted_at IS NULL UNION SELECT * FROM payoff_goals WHERE user_id = ? AND deleted_at IS NULL'
      : 'SELECT * FROM savings_goals WHERE deleted_at IS NULL UNION SELECT * FROM payoff_goals WHERE deleted_at IS NULL';

    const params = userId ? [userId, userId] : [];
    const [rows] = await this.connection.execute(sql, params);
    return rows as any[];
  }

  async readAlerts(userId?: string): Promise<any[]> {
    const sql = userId
      ? 'SELECT * FROM alerts WHERE user_id = ? AND deleted_at IS NULL'
      : 'SELECT * FROM alerts WHERE deleted_at IS NULL';

    const [rows] = await this.connection.execute(sql, userId ? [userId] : []);
    return rows as any[];
  }

  async close() {
    await this.connection.end();
  }
}
```

---

## Test Data Generator

### Tool 2: Realistic Test Data Generation

```typescript
// tools/seed/index.ts

import { Command } from 'commander';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import * as generators from './generators';

const program = new Command();
const prisma = new PrismaClient();

program
  .name('pfm-seed')
  .description('Generate realistic test data for PFM Simulator')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate test data with specified scenario')
  .option('-s, --scenario <name>', 'Predefined scenario (basic, realistic, stress)', 'basic')
  .option('-p, --partners <count>', 'Number of partners to generate', '1')
  .option('-u, --users <count>', 'Number of users per partner', '10')
  .option('-a, --accounts <count>', 'Number of accounts per user', '3')
  .option('-t, --transactions <count>', 'Number of transactions per account', '100')
  .option('--clear', 'Clear existing data before generating')
  .action(async (options) => {
    console.log('Generating test data...\n');

    try {
      if (options.clear) {
        console.log('Clearing existing data...');
        await clearDatabase();
        console.log('✓ Database cleared\n');
      }

      const scenario = getScenario(options.scenario);

      // Generate partners
      console.log(`Generating ${options.partners} partners...`);
      const partners = await generators.generatePartners(
        parseInt(options.partners)
      );
      console.log(`✓ Generated ${partners.length} partners\n`);

      // Generate users for each partner
      console.log(`Generating ${options.users} users per partner...`);
      const users = [];
      for (const partner of partners) {
        const partnerUsers = await generators.generateUsers(
          partner.id,
          parseInt(options.users)
        );
        users.push(...partnerUsers);
      }
      console.log(`✓ Generated ${users.length} users\n`);

      // Generate accounts for each user
      console.log(`Generating ${options.accounts} accounts per user...`);
      const accounts = [];
      for (const user of users) {
        const userAccounts = await generators.generateAccounts(
          user.id,
          user.partnerId,
          parseInt(options.accounts)
        );
        accounts.push(...userAccounts);
      }
      console.log(`✓ Generated ${accounts.length} accounts\n`);

      // Generate transactions for each account
      console.log(`Generating ${options.transactions} transactions per account...`);
      let transactionCount = 0;
      for (const account of accounts) {
        await generators.generateTransactions(
          account.userId,
          account.id,
          parseInt(options.transactions)
        );
        transactionCount += parseInt(options.transactions);
      }
      console.log(`✓ Generated ${transactionCount} transactions\n`);

      // Generate budgets
      console.log('Generating budgets...');
      for (const user of users) {
        await generators.generateBudgets(user.id, 3);
      }
      console.log(`✓ Generated budgets\n`);

      // Generate goals
      console.log('Generating goals...');
      for (const user of users) {
        await generators.generateGoals(user.id, 2);
      }
      console.log(`✓ Generated goals\n`);

      // Generate alerts
      console.log('Generating alerts...');
      for (const user of users) {
        await generators.generateAlerts(user.id, 2);
      }
      console.log(`✓ Generated alerts\n`);

      console.log('Test data generation completed successfully!');
    } catch (error) {
      console.error('Data generation failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

program.parse();

async function clearDatabase() {
  // Order matters due to foreign keys
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.partner.deleteMany();
}

function getScenario(name: string) {
  // Predefined scenarios with realistic data patterns
  const scenarios = {
    basic: {
      partners: 1,
      usersPerPartner: 5,
      accountsPerUser: 3,
      transactionsPerAccount: 50
    },
    realistic: {
      partners: 1,
      usersPerPartner: 100,
      accountsPerUser: 4,
      transactionsPerAccount: 200
    },
    stress: {
      partners: 5,
      usersPerPartner: 1000,
      accountsPerUser: 5,
      transactionsPerAccount: 500
    }
  };

  return scenarios[name] || scenarios.basic;
}
```

### Data Generators Example

```typescript
// tools/seed/generators/users.ts

import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function generateUsers(partnerId: bigint, count: number) {
  const users = [];

  for (let i = 0; i < count; i++) {
    const email = faker.internet.email();
    const password = 'Password123!'; // Default test password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        partnerId,
        email,
        hashedPassword,
        salt,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number(),
        timezone: faker.location.timeZone(),
        jwtSecret: faker.string.alphanumeric(32),
        loginCount: faker.number.int({ min: 0, max: 100 }),
        preferences: {
          theme: faker.helpers.arrayElement(['light', 'dark']),
          notifications: true
        }
      }
    });

    users.push(user);
  }

  return users;
}
```

```typescript
// tools/seed/generators/transactions.ts

import { faker } from '@faker-js/faker';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const MERCHANT_CATEGORIES = {
  'Groceries': ['Whole Foods', 'Safeway', 'Kroger', 'Trader Joe\'s'],
  'Gas & Fuel': ['Shell', 'Chevron', 'BP', 'Exxon'],
  'Restaurants': ['Starbucks', 'McDonald\'s', 'Chipotle', 'Subway'],
  'Shopping': ['Amazon', 'Target', 'Walmart', 'Best Buy'],
  'Utilities': ['PG&E', 'Comcast', 'AT&T', 'Water District']
};

export async function generateTransactions(
  userId: bigint,
  accountId: bigint,
  count: number
) {
  const transactions = [];

  // Get tags for categorization
  const tags = await prisma.tag.findMany({
    where: { tagType: 'system' }
  });

  for (let i = 0; i < count; i++) {
    // Generate date within last 90 days
    const postedAt = faker.date.recent({ days: 90 });

    // Pick random category and merchant
    const category = faker.helpers.objectKey(MERCHANT_CATEGORIES);
    const merchantName = faker.helpers.arrayElement(MERCHANT_CATEGORIES[category]);

    // Generate realistic amount
    const isDebit = faker.datatype.boolean(0.8); // 80% debits
    const amount = faker.number.float({
      min: isDebit ? -200 : 500,
      max: isDebit ? -5 : 5000,
      precision: 0.01
    });

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        accountId,
        referenceId: faker.string.uuid(),
        description: `${merchantName} - ${category}`,
        originalDescription: faker.lorem.words(3),
        merchantName,
        amount,
        transactionType: isDebit ? TransactionType.debit : TransactionType.credit,
        postedAt,
        transactedAt: faker.date.recent({ days: 1, refDate: postedAt }),
        primaryTagId: faker.helpers.arrayElement(tags)?.id,
        metadata: {
          location: faker.location.city()
        }
      }
    });

    transactions.push(transaction);
  }

  return transactions;
}
```

---

## Docker Compose Setup

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: pfm-simulator-db
    environment:
      POSTGRES_USER: pfm_user
      POSTGRES_PASSWORD: pfm_password
      POSTGRES_DB: pfm_simulator
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pfm_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pfm-simulator-api
    environment:
      DATABASE_URL: postgresql://pfm_user:pfm_password@postgres:5432/pfm_simulator
      JWT_SECRET: your-secret-key-change-in-production
      NODE_ENV: development
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./src:/app/src
      - ./prisma:/app/prisma
    command: npm run dev

volumes:
  postgres_data:
```

---

## Quick Start Guide

### Installation

```bash
# 1. Clone/create project
mkdir pfm-backend-simulator
cd pfm-backend-simulator

# 2. Initialize project
npm init -y

# 3. Install dependencies
npm install express prisma @prisma/client jsonwebtoken bcrypt zod pino
npm install -D typescript @types/node @types/express @types/jsonwebtoken @types/bcrypt ts-node nodemon eslint prettier

# 4. Install migration tools
npm install mysql2 @faker-js/faker commander cli-progress

# 5. Setup Prisma
npx prisma init
```

### Configuration

```bash
# .env
DATABASE_URL="postgresql://pfm_user:pfm_password@localhost:5432/pfm_simulator"
JWT_SECRET="your-secret-key-change-in-production"
NODE_ENV="development"
PORT=3000
```

### Running

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npm run seed -- generate --scenario realistic

# Start API server
npm run dev

# API available at http://localhost:3000/api/v2
```

---

## Testing Strategy

```typescript
// tests/integration/accounts.test.ts

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import { generateJWT } from '../helpers/auth';

describe('Accounts API', () => {
  let authToken: string;
  let userId: string;
  let partnerId: string;

  beforeAll(async () => {
    // Create test user and get JWT
    const user = await prisma.user.create({
      data: {
        partnerId: 1n,
        email: 'test@example.com',
        hashedPassword: 'hashed',
        firstName: 'Test',
        lastName: 'User'
      }
    });

    userId = user.id.toString();
    partnerId = user.partnerId.toString();
    authToken = generateJWT({ userId, partnerId });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: BigInt(userId) } });
    await prisma.$disconnect();
  });

  describe('GET /users/:userId/accounts/all', () => {
    it('should return all user accounts', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/accounts/all`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
      expect(Array.isArray(response.body.accounts)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v2/users/${userId}/accounts/all`)
        .expect(401);
    });

    it('should return 403 for different user', async () => {
      await request(app)
        .get('/api/v2/users/999/accounts/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('PUT /users/:userId/accounts/:id', () => {
    let accountId: string;

    beforeEach(async () => {
      const account = await prisma.account.create({
        data: {
          userId: BigInt(userId),
          partnerId: BigInt(partnerId),
          name: 'Test Account',
          accountType: 'checking'
        }
      });
      accountId = account.id.toString();
    });

    afterEach(async () => {
      await prisma.account.delete({ where: { id: BigInt(accountId) } });
    });

    it('should update account successfully', async () => {
      const response = await request(app)
        .put(`/api/v2/users/${userId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account: {
            name: 'Updated Account Name',
            include_in_networth: false
          }
        })
        .expect(200);

      expect(response.body.account.name).toBe('Updated Account Name');
      expect(response.body.account.include_in_networth).toBe(false);
    });
  });
});
```

---

## Deployment Considerations

### Environment Variables

```bash
# Production .env
DATABASE_URL="postgresql://user:password@prod-db:5432/pfm_simulator"
JWT_SECRET="strong-random-secret-minimum-32-chars"
NODE_ENV="production"
PORT=3000
LOG_LEVEL="info"
ENABLE_CORS=true
CORS_ORIGINS="https://tiles.example.com,https://app.example.com"
```

### Docker Production Image

```dockerfile
# Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["npm", "start"]
```

---

## Summary & Next Steps

### Deliverables

1. ✅ **Complete API Implementation** (135+ endpoints)
2. ✅ **PostgreSQL Schema** (Prisma-based)
3. ✅ **Migration Tool** (MySQL → PostgreSQL)
4. ✅ **Test Data Generator** (Faker.js-based)
5. ✅ **Docker Compose Setup** (Local development)
6. ✅ **Testing Strategy** (Integration tests)

### Implementation Phases

**Phase 1** (Week 1): Core Setup
- Initialize project structure
- Setup Prisma with PostgreSQL schema
- Implement authentication middleware
- Create 5 core endpoints (users, partners, accounts)

**Phase 2** (Week 2): Core Entities
- Implement all account endpoints
- Implement transaction endpoints
- Implement tag endpoints
- Setup test data generator

**Phase 3** (Week 3): Financial Features
- Implement budget endpoints
- Implement goal endpoints
- Implement cashflow endpoints
- Create integration tests

**Phase 4** (Week 4): Alerts & Supporting
- Implement alert endpoints
- Implement notification endpoints
- Implement remaining endpoints (ads, tickets, etc.)
- Build migration tool

**Phase 5** (Week 5): Testing & Documentation
- Complete test coverage
- Performance testing
- API documentation (OpenAPI/Swagger)
- Deployment guide

### Estimated Effort

- **Development**: 4-5 weeks (1 developer)
- **Testing**: 1 week
- **Documentation**: 3-4 days
- **Total**: ~6 weeks for production-ready simulator

### Success Criteria

- ✅ All 135+ responsive-tiles endpoints implemented
- ✅ 80%+ test coverage
- ✅ Migration tool successfully imports from Geezeo MySQL
- ✅ Can run entirely locally with Docker Compose
- ✅ Performance: <100ms response time for 95% of requests
- ✅ Responsive-tiles fully functional against simulator
