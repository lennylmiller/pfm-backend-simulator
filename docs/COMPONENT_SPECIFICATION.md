# Component Design Specification
**pfm-backend-simulator Component Architecture**

**Version**: 1.0.0
**Date**: 2025-10-04
**Purpose**: Detailed component interface and implementation specifications

---

## Table of Contents

1. [Component Architecture Overview](#1-component-architecture-overview)
2. [Controller Layer Specifications](#2-controller-layer-specifications)
3. [Service Layer Specifications](#3-service-layer-specifications)
4. [Validation Layer Specifications](#4-validation-layer-specifications)
5. [Serialization Components](#5-serialization-components)
6. [Middleware Components](#6-middleware-components)
7. [Utility Components](#7-utility-components)
8. [Testing Components](#8-testing-components)

---

## 1. Component Architecture Overview

### 1.1 Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                         HTTP Layer                           │
│  Express.js → Middleware → Routes → Controllers             │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                    Controller Layer                          │
│  • Request parsing & validation                              │
│  • Response formatting                                       │
│  • Error handling                                            │
│  • Service orchestration                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                     Service Layer                            │
│  • Business logic                                            │
│  • Data aggregation                                          │
│  • Calculations                                              │
│  • Transaction management                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                      Data Layer                              │
│  Prisma ORM → PostgreSQL                                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Dependency Rules

**Allowed Dependencies**:
- Controllers → Services, Validators, Serializers
- Services → Prisma, Utilities
- Validators → Zod schemas
- Serializers → Utilities

**Forbidden Dependencies**:
- Services → Controllers (❌)
- Validators → Services (❌)
- Utilities → Controllers/Services (❌)

### 1.3 Component Interfaces

**Standard Component Structure**:
```typescript
// Component interface
export interface IComponentName {
  method(params: Type): Promise<ReturnType>;
}

// Component implementation
export class ComponentName implements IComponentName {
  async method(params: Type): Promise<ReturnType> {
    // Implementation
  }
}

// Functional alternative (preferred for stateless components)
export async function componentFunction(params: Type): Promise<ReturnType> {
  // Implementation
}
```

---

## 2. Controller Layer Specifications

### 2.1 Controller Interface Pattern

**Base Controller Interface**:
```typescript
// src/types/controllers.ts

import { Request, Response, NextFunction } from 'express';

export interface IController {
  // Collection operations
  list?(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Member operations
  show?(req: Request, res: Response, next: NextFunction): Promise<void>;
  create?(req: Request, res: Response, next: NextFunction): Promise<void>;
  update?(req: Request, res: Response, next: NextFunction): Promise<void>;
  destroy?(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Special actions
  archive?(req: Request, res: Response, next: NextFunction): Promise<void>;
  search?(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export interface RequestContext {
  userId: bigint;
  partnerId: bigint;
}

// Extend Express Request to include context
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}
```

### 2.2 Goals Controller Specification

**Interface**:
```typescript
// src/controllers/goalsController.ts

import { Request, Response, NextFunction } from 'express';
import { IGoalService } from '../services/goalService';
import { validatePayoffGoal, validateSavingsGoal } from '../validators/goalSchemas';
import { serializeGoal } from '../utils/serializers';
import { logger } from '../config/logger';

export interface IGoalsController {
  // Payoff Goals
  listPayoffGoals(req: Request, res: Response, next: NextFunction): Promise<void>;
  getPayoffGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
  createPayoffGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
  updatePayoffGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
  deletePayoffGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
  archivePayoffGoal(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Savings Goals
  listSavingsGoals(req: Request, res: Response, next: NextFunction): Promise<void>;
  getSavingsGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
  createSavingsGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateSavingsGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
  deleteSavingsGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
  archiveSavingsGoal(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Goal Images
  listPayoffGoalImages(req: Request, res: Response, next: NextFunction): Promise<void>;
  listSavingsGoalImages(req: Request, res: Response, next: NextFunction): Promise<void>;
}
```

**Implementation Template**:
```typescript
// List Payoff Goals
export async function listPayoffGoals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract parameters
    const userId = BigInt(req.params.userId);
    const includeArchived = req.query.include_archived === 'true';

    // 2. Validate authorization (userId matches JWT context)
    if (userId !== req.context.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // 3. Call service layer
    const goals = await goalService.getPayoffGoals(userId, { includeArchived });

    // 4. Serialize response
    const serialized = goals.map(goal => serializeGoal(goal, 'payoff'));

    // 5. Send response
    res.status(200).json({
      payoff_goals: serialized
    });
  } catch (error) {
    // 6. Error handling
    logger.error({ error, userId: req.params.userId }, 'Failed to list payoff goals');
    next(error); // Pass to error middleware
  }
}

// Create Payoff Goal
export async function createPayoffGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract and validate input
    const userId = BigInt(req.params.userId);
    const goalData = req.body.payoff_goal;

    // 2. Validate request body
    const validatedData = validatePayoffGoal(goalData);

    // 3. Authorization check
    if (userId !== req.context.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // 4. Call service layer
    const goal = await goalService.createPayoffGoal(userId, validatedData);

    // 5. Serialize and respond
    res.status(201).json({
      payoff_goal: serializeGoal(goal, 'payoff')
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }

    logger.error({ error, userId: req.params.userId }, 'Failed to create payoff goal');
    next(error);
  }
}

// Update Payoff Goal
export async function updatePayoffGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);
    const updates = req.body.payoff_goal;

    // Validate partial update data
    const validatedData = validatePayoffGoal(updates, { partial: true });

    // Service call with ownership verification
    const goal = await goalService.updatePayoffGoal(userId, goalId, validatedData);

    if (!goal) {
      res.status(404).json({ error: 'Payoff goal not found' });
      return;
    }

    res.status(200).json({
      payoff_goal: serializeGoal(goal, 'payoff')
    });
  } catch (error) {
    logger.error({ error, goalId: req.params.id }, 'Failed to update payoff goal');
    next(error);
  }
}

// Delete Payoff Goal (Soft Delete)
export async function deletePayoffGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);

    const deleted = await goalService.deletePayoffGoal(userId, goalId);

    if (!deleted) {
      res.status(404).json({ error: 'Payoff goal not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error({ error, goalId: req.params.id }, 'Failed to delete payoff goal');
    next(error);
  }
}

// Archive Payoff Goal
export async function archivePayoffGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);

    const archived = await goalService.archivePayoffGoal(userId, goalId);

    if (!archived) {
      res.status(404).json({ error: 'Payoff goal not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error({ error, goalId: req.params.id }, 'Failed to archive payoff goal');
    next(error);
  }
}
```

### 2.3 Cashflow Controller Specification

**Interface**:
```typescript
// src/controllers/cashflowController.ts

export interface ICashflowController {
  // Summary
  getCashflowSummary(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateCashflowSettings(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Bills
  listBills(req: Request, res: Response, next: NextFunction): Promise<void>;
  createBill(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateBill(req: Request, res: Response, next: NextFunction): Promise<void>;
  deleteBill(req: Request, res: Response, next: NextFunction): Promise<void>;
  stopBill(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Incomes
  listIncomes(req: Request, res: Response, next: NextFunction): Promise<void>;
  createIncome(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateIncome(req: Request, res: Response, next: NextFunction): Promise<void>;
  deleteIncome(req: Request, res: Response, next: NextFunction): Promise<void>;
  stopIncome(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Events
  listEvents(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateEvent(req: Request, res: Response, next: NextFunction): Promise<void>;
  deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void>;
}
```

**Key Implementation**:
```typescript
export async function getCashflowSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);

    // Parse date range (default: next 90 days)
    const startDate = req.query.start_date
      ? new Date(req.query.start_date as string)
      : new Date();

    const endDate = req.query.end_date
      ? new Date(req.query.end_date as string)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // Get cashflow data
    const summary = await cashflowService.getCashflowSummary(userId, {
      startDate,
      endDate
    });

    res.status(200).json({
      cashflow: serializeCashflowSummary(summary)
    });
  } catch (error) {
    logger.error({ error, userId: req.params.userId }, 'Failed to get cashflow summary');
    next(error);
  }
}

export async function createBill(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const billData = req.body.bill;

    // Validate bill data
    const validatedData = validateBill(billData);

    // Create bill
    const bill = await cashflowService.createBill(userId, validatedData);

    res.status(201).json({
      bill: serializeBill(bill)
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }

    logger.error({ error, userId: req.params.userId }, 'Failed to create bill');
    next(error);
  }
}
```

### 2.4 Alerts Controller Specification

**Interface**:
```typescript
// src/controllers/alertsController.ts

export interface IAlertsController {
  // Base alerts
  listAlerts(req: Request, res: Response, next: NextFunction): Promise<void>;
  getAlert(req: Request, res: Response, next: NextFunction): Promise<void>;
  deleteAlert(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Alert types (create & update for each)
  createAccountThresholdAlert(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateAccountThresholdAlert(req: Request, res: Response, next: NextFunction): Promise<void>;

  createGoalAlert(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateGoalAlert(req: Request, res: Response, next: NextFunction): Promise<void>;

  createMerchantNameAlert(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateMerchantNameAlert(req: Request, res: Response, next: NextFunction): Promise<void>;

  createSpendingTargetAlert(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateSpendingTargetAlert(req: Request, res: Response, next: NextFunction): Promise<void>;

  createTransactionLimitAlert(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateTransactionLimitAlert(req: Request, res: Response, next: NextFunction): Promise<void>;

  createUpcomingBillAlert(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateUpcomingBillAlert(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Destinations
  getAlertDestinations(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateAlertDestinations(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Notifications
  listNotifications(req: Request, res: Response, next: NextFunction): Promise<void>;
  getNotification(req: Request, res: Response, next: NextFunction): Promise<void>;
  deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void>;
}
```

---

## 3. Service Layer Specifications

### 3.1 Service Interface Pattern

**Base Service Interface**:
```typescript
// src/types/services.ts

export interface IService {
  // CRUD operations
  findMany?(filters: FilterType): Promise<EntityType[]>;
  findUnique?(id: bigint): Promise<EntityType | null>;
  create?(data: CreateType): Promise<EntityType>;
  update?(id: bigint, data: UpdateType): Promise<EntityType | null>;
  delete?(id: bigint): Promise<boolean>;
}
```

### 3.2 Goal Service Specification

**Interface**:
```typescript
// src/services/goalService.ts

import { Decimal } from '@prisma/client/runtime/library';
import { Goal, GoalType } from '@prisma/client';

export interface IGoalService {
  // Payoff Goals
  getPayoffGoals(userId: bigint, options?: GetGoalsOptions): Promise<Goal[]>;
  getPayoffGoal(userId: bigint, goalId: bigint): Promise<Goal | null>;
  createPayoffGoal(userId: bigint, data: CreatePayoffGoalData): Promise<Goal>;
  updatePayoffGoal(userId: bigint, goalId: bigint, data: UpdatePayoffGoalData): Promise<Goal | null>;
  deletePayoffGoal(userId: bigint, goalId: bigint): Promise<boolean>;
  archivePayoffGoal(userId: bigint, goalId: bigint): Promise<boolean>;

  // Savings Goals
  getSavingsGoals(userId: bigint, options?: GetGoalsOptions): Promise<Goal[]>;
  getSavingsGoal(userId: bigint, goalId: bigint): Promise<Goal | null>;
  createSavingsGoal(userId: bigint, data: CreateSavingsGoalData): Promise<Goal>;
  updateSavingsGoal(userId: bigint, goalId: bigint, data: UpdateSavingsGoalData): Promise<Goal | null>;
  deleteSavingsGoal(userId: bigint, goalId: bigint): Promise<boolean>;
  archiveSavingsGoal(userId: bigint, goalId: bigint): Promise<boolean>;

  // Calculations
  calculateProgress(goal: Goal): number;
  calculateStatus(goal: Goal): 'under' | 'risk' | 'complete';
}

export interface GetGoalsOptions {
  includeArchived?: boolean;
  state?: 'active' | 'archived';
}

export interface CreatePayoffGoalData {
  name: string;
  currentValue: Decimal;
  accountId: bigint;
  targetCompletionOn?: Date;
  monthlyContribution?: Decimal;
  imageUrl?: string;
}

export interface UpdatePayoffGoalData {
  name?: string;
  currentValue?: Decimal;
  accountId?: bigint;
  targetCompletionOn?: Date;
  monthlyContribution?: Decimal;
  imageUrl?: string;
}

export interface CreateSavingsGoalData {
  name: string;
  targetValue: Decimal;
  currentValue?: Decimal;
  accountId?: bigint;
  targetCompletionOn?: Date;
  monthlyContribution?: Decimal;
  imageUrl?: string;
}

export interface UpdateSavingsGoalData {
  name?: string;
  targetValue?: Decimal;
  currentValue?: Decimal;
  accountId?: bigint;
  targetCompletionOn?: Date;
  monthlyContribution?: Decimal;
  imageUrl?: string;
}
```

**Implementation**:
```typescript
import { prisma } from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import { Goal } from '@prisma/client';

// Get Payoff Goals
export async function getPayoffGoals(
  userId: bigint,
  options: GetGoalsOptions = {}
): Promise<Goal[]> {
  const { includeArchived = false } = options;

  const where: any = {
    userId,
    goalType: 'payoff',
    deletedAt: null
  };

  if (!includeArchived) {
    where.archivedAt = null;
  }

  return await prisma.goal.findMany({
    where,
    orderBy: [
      { archivedAt: 'asc' },
      { createdAt: 'desc' }
    ]
  });
}

// Create Payoff Goal
export async function createPayoffGoal(
  userId: bigint,
  data: CreatePayoffGoalData
): Promise<Goal> {
  // Validate account ownership
  const account = await prisma.account.findFirst({
    where: {
      id: data.accountId,
      userId,
      deletedAt: null
    }
  });

  if (!account) {
    throw new Error('Account not found or does not belong to user');
  }

  return await prisma.goal.create({
    data: {
      userId,
      goalType: 'payoff',
      name: data.name,
      targetAmount: new Decimal(0), // Payoff goals always target 0
      currentAmount: data.currentValue,
      accountId: data.accountId,
      targetDate: data.targetCompletionOn,
      imageUrl: data.imageUrl,
      metadata: {
        initialValue: data.currentValue.toString(),
        monthlyContribution: data.monthlyContribution?.toString() || '0.00'
      }
    }
  });
}

// Update Payoff Goal
export async function updatePayoffGoal(
  userId: bigint,
  goalId: bigint,
  data: UpdatePayoffGoalData
): Promise<Goal | null> {
  // Verify ownership
  const existing = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
      goalType: 'payoff',
      deletedAt: null
    }
  });

  if (!existing) {
    return null;
  }

  // Validate account if provided
  if (data.accountId) {
    const account = await prisma.account.findFirst({
      where: {
        id: data.accountId,
        userId,
        deletedAt: null
      }
    });

    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }
  }

  // Build update data
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.currentValue !== undefined) updateData.currentAmount = data.currentValue;
  if (data.accountId !== undefined) updateData.accountId = data.accountId;
  if (data.targetCompletionOn !== undefined) updateData.targetDate = data.targetCompletionOn;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

  if (data.monthlyContribution !== undefined) {
    updateData.metadata = {
      ...existing.metadata,
      monthlyContribution: data.monthlyContribution.toString()
    };
  }

  return await prisma.goal.update({
    where: { id: goalId },
    data: updateData
  });
}

// Delete Payoff Goal (Soft Delete)
export async function deletePayoffGoal(
  userId: bigint,
  goalId: bigint
): Promise<boolean> {
  const result = await prisma.goal.updateMany({
    where: {
      id: goalId,
      userId,
      goalType: 'payoff',
      deletedAt: null
    },
    data: {
      deletedAt: new Date()
    }
  });

  return result.count > 0;
}

// Archive Payoff Goal
export async function archivePayoffGoal(
  userId: bigint,
  goalId: bigint
): Promise<boolean> {
  const result = await prisma.goal.updateMany({
    where: {
      id: goalId,
      userId,
      goalType: 'payoff',
      deletedAt: null
    },
    data: {
      archivedAt: new Date()
    }
  });

  return result.count > 0;
}

// Calculate Progress
export function calculateProgress(goal: Goal): number {
  if (goal.goalType === 'payoff') {
    const initial = new Decimal(
      (goal.metadata as any).initialValue || goal.currentAmount
    );
    const current = goal.currentAmount;
    const paidOff = initial.minus(current);

    return Math.min(100, Math.max(0,
      paidOff.div(initial).mul(100).toNumber()
    ));
  } else {
    // Savings goal
    return Math.min(100, Math.max(0,
      goal.currentAmount.div(goal.targetAmount).mul(100).toNumber()
    ));
  }
}

// Calculate Status
export function calculateStatus(goal: Goal): 'under' | 'risk' | 'complete' {
  const progress = calculateProgress(goal);

  if (progress >= 100) {
    return 'complete';
  }

  if (!goal.targetDate) {
    return 'under';
  }

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

### 3.3 Cashflow Service Specification

**Interface**:
```typescript
// src/services/cashflowService.ts

export interface ICashflowService {
  // Summary
  getCashflowSummary(userId: bigint, options: CashflowSummaryOptions): Promise<CashflowSummary>;
  updateCashflowSettings(userId: bigint, settings: CashflowSettings): Promise<CashflowSettings>;

  // Bills
  getBills(userId: bigint, options?: GetBillsOptions): Promise<CashflowBill[]>;
  createBill(userId: bigint, data: CreateBillData): Promise<CashflowBill>;
  updateBill(userId: bigint, billId: bigint, data: UpdateBillData): Promise<CashflowBill | null>;
  deleteBill(userId: bigint, billId: bigint): Promise<boolean>;
  stopBill(userId: bigint, billId: bigint): Promise<boolean>;

  // Incomes
  getIncomes(userId: bigint, options?: GetIncomesOptions): Promise<CashflowIncome[]>;
  createIncome(userId: bigint, data: CreateIncomeData): Promise<CashflowIncome>;
  updateIncome(userId: bigint, incomeId: bigint, data: UpdateIncomeData): Promise<CashflowIncome | null>;
  deleteIncome(userId: bigint, incomeId: bigint): Promise<boolean>;
  stopIncome(userId: bigint, incomeId: bigint): Promise<boolean>;

  // Events
  getEvents(userId: bigint, options: GetEventsOptions): Promise<CashflowEvent[]>;
  generateEvents(userId: bigint, startDate: Date, endDate: Date): Promise<CashflowEvent[]>;
  updateEvent(userId: bigint, eventId: bigint, data: UpdateEventData): Promise<CashflowEvent | null>;
  deleteEvent(userId: bigint, eventId: bigint): Promise<boolean>;
}

export interface CashflowSummaryOptions {
  startDate: Date;
  endDate: Date;
}

export interface CashflowSummary {
  totalIncome: Decimal;
  totalBills: Decimal;
  netCashflow: Decimal;
  startDate: Date;
  endDate: Date;
  billsCount: number;
  incomesCount: number;
  eventsCount: number;
  settings: CashflowSettings;
}

export interface CashflowSettings {
  autoCategorize: boolean;
  showProjections: boolean;
  projectionDays: number;
}
```

**Key Implementation**:
```typescript
// Generate Cashflow Events
export async function generateEvents(
  userId: bigint,
  startDate: Date,
  endDate: Date
): Promise<CashflowEvent[]> {
  // Get active bills and incomes
  const [bills, incomes] = await Promise.all([
    prisma.cashflowBill.findMany({
      where: { userId, active: true, deletedAt: null }
    }),
    prisma.cashflowIncome.findMany({
      where: { userId, active: true, deletedAt: null }
    })
  ]);

  const events: CashflowEvent[] = [];

  // Project bills
  for (const bill of bills) {
    const billEvents = projectRecurring(
      bill,
      'bill',
      'expense',
      startDate,
      endDate
    );
    events.push(...billEvents);
  }

  // Project incomes
  for (const income of incomes) {
    const incomeEvents = projectRecurring(
      income,
      'income',
      'income',
      startDate,
      endDate
    );
    events.push(...incomeEvents);
  }

  // Sort by date
  events.sort((a, b) =>
    a.eventDate.getTime() - b.eventDate.getTime()
  );

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
  const events: any[] = [];
  const dueDate = 'dueDate' in item ? item.dueDate : item.receiveDate;
  const recurrence = item.recurrence;

  let current = new Date(startDate);
  current.setDate(dueDate);

  // Adjust to first occurrence at or after startDate
  if (current < startDate) {
    if (recurrence === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    }
  }

  while (current <= endDate) {
    if (current >= startDate) {
      events.push({
        userId: item.userId,
        sourceType,
        sourceId: item.id,
        name: item.name,
        amount: item.amount,
        eventDate: new Date(current),
        eventType,
        accountId: item.accountId,
        processed: false,
        metadata: {
          recurrence,
          originalDueDate: dueDate
        }
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

### 3.4 Calculation Service Specification

**Interface**:
```typescript
// src/services/calculationService.ts

export interface ICalculationService {
  // Budget calculations
  calculateBudgetSpent(budgetId: bigint): Promise<Decimal>;
  calculateBudgetState(budget: Budget, spent: Decimal): 'under' | 'risk' | 'over';

  // Expense calculations
  calculateExpenses(userId: bigint, options: ExpenseOptions): Promise<ExpenseData>;

  // Networth calculations
  calculateNetworth(userId: bigint): Promise<NetworthData>;
  calculateNetworthByAccount(userId: bigint): Promise<NetworthByAccount>;
}

export interface ExpenseOptions {
  startDate: Date;
  endDate: Date;
  includeTags?: bigint[];
  excludeTags?: bigint[];
}

export interface ExpenseData {
  total: Decimal;
  periodStart: Date;
  periodEnd: Date;
  categories: ExpenseCategory[];
}

export interface ExpenseCategory {
  tagId: bigint;
  tagName: string;
  amount: Decimal;
  transactionCount: number;
  averageAmount: Decimal;
  percentOfTotal: number;
}

export interface NetworthData {
  total: Decimal;
  assets: Decimal;
  liabilities: Decimal;
  calculatedAt: Date;
  accountsIncluded: number;
  accountsExcluded: number;
}
```

---

## 4. Validation Layer Specifications

### 4.1 Validation Pattern

**Zod Schema Pattern**:
```typescript
// src/validators/goalSchemas.ts

import { z } from 'zod';

// Payoff Goal Schema
export const PayoffGoalCreateSchema = z.object({
  name: z.string().min(1).max(255),
  current_value: z.string().regex(/^\d+\.\d{2}$/, 'Must be decimal with 2 places'),
  account_id: z.union([z.string(), z.number()]),
  target_completion_on: z.string().datetime().optional(),
  monthly_contribution: z.string().regex(/^\d+\.\d{2}$/).optional(),
  image_name: z.string().optional(),
  image_url: z.string().url().optional()
});

export const PayoffGoalUpdateSchema = PayoffGoalCreateSchema.partial();

// Savings Goal Schema
export const SavingsGoalCreateSchema = z.object({
  name: z.string().min(1).max(255),
  target_value: z.string().regex(/^\d+\.\d{2}$/),
  current_value: z.string().regex(/^\d+\.\d{2}$/).optional(),
  account_id: z.union([z.string(), z.number()]).optional(),
  target_completion_on: z.string().datetime().optional(),
  monthly_contribution: z.string().regex(/^\d+\.\d{2}$/).optional(),
  image_name: z.string().optional(),
  image_url: z.string().url().optional()
});

export const SavingsGoalUpdateSchema = SavingsGoalCreateSchema.partial();

// Validation Functions
export function validatePayoffGoal(
  data: unknown,
  options: { partial?: boolean } = {}
): any {
  const schema = options.partial
    ? PayoffGoalUpdateSchema
    : PayoffGoalCreateSchema;

  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw validationError;
    }
    throw error;
  }
}

export function validateSavingsGoal(
  data: unknown,
  options: { partial?: boolean } = {}
): any {
  const schema = options.partial
    ? SavingsGoalUpdateSchema
    : SavingsGoalCreateSchema;

  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw validationError;
    }
    throw error;
  }
}
```

### 4.2 Cashflow Validation Schemas

```typescript
// src/validators/cashflowSchemas.ts

export const BillSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.string().regex(/^\d+\.\d{2}$/),
  due_date: z.number().int().min(1).max(31),
  recurrence: z.enum(['monthly', 'biweekly', 'weekly']),
  category_id: z.union([z.string(), z.number()]).optional(),
  account_id: z.union([z.string(), z.number()]).optional()
});

export const IncomeSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.string().regex(/^\d+\.\d{2}$/),
  receive_date: z.number().int().min(1).max(31),
  recurrence: z.enum(['monthly', 'biweekly', 'weekly']),
  category_id: z.union([z.string(), z.number()]).optional(),
  account_id: z.union([z.string(), z.number()]).optional()
});

export function validateBill(data: unknown, partial = false): any {
  const schema = partial ? BillSchema.partial() : BillSchema;

  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw validationError;
    }
    throw error;
  }
}
```

---

## 5. Serialization Components

### 5.1 Serializer Interface

```typescript
// src/utils/serializers.ts

export interface ISerializer<T, R> {
  serialize(data: T): R;
  serializeMany(data: T[]): R[];
}

// Generic serialization utilities
export function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export function serializeBigInt(value: bigint): number {
  return Number(value);
}

export function serializeDecimal(value: Decimal): string {
  return value.toFixed(2);
}

export function serializeDate(value: Date): string {
  return value.toISOString();
}

export function serializeDateOnly(value: Date): string {
  return value.toISOString().split('T')[0];
}
```

### 5.2 Goal Serializer

```typescript
// Serialize Goal to Payoff/Savings format
export function serializeGoal(goal: Goal, type: 'payoff' | 'savings'): any {
  const progress = calculateProgress(goal);
  const status = calculateStatus(goal);
  const metadata = goal.metadata as any;

  if (type === 'payoff') {
    return {
      id: serializeBigInt(goal.id),
      user_id: serializeBigInt(goal.userId),
      name: goal.name,
      state: goal.archivedAt ? 'archived' : 'active',
      status,
      percent_complete: progress,
      initial_value: metadata.initialValue || serializeDecimal(goal.currentAmount),
      current_value: serializeDecimal(goal.currentAmount),
      target_value: '0.00',
      monthly_contribution: metadata.monthlyContribution || '0.00',
      target_completion_on: goal.targetDate ? serializeDateOnly(goal.targetDate) : null,
      image_name: extractImageName(goal.imageUrl),
      image_url: goal.imageUrl,
      complete: goal.currentAmount.lte(new Decimal(0)),
      created_at: serializeDate(goal.createdAt),
      updated_at: serializeDate(goal.updatedAt),
      links: {
        accounts: goal.accountId ? [serializeBigInt(goal.accountId)] : []
      }
    };
  } else {
    // Savings goal
    return {
      id: serializeBigInt(goal.id),
      user_id: serializeBigInt(goal.userId),
      name: goal.name,
      state: goal.archivedAt ? 'archived' : 'active',
      status,
      percent_complete: progress,
      initial_value: metadata.initialValue || '0.00',
      current_value: serializeDecimal(goal.currentAmount),
      target_value: serializeDecimal(goal.targetAmount),
      monthly_contribution: metadata.monthlyContribution || '0.00',
      target_completion_on: goal.targetDate ? serializeDateOnly(goal.targetDate) : null,
      image_name: extractImageName(goal.imageUrl),
      image_url: goal.imageUrl,
      complete: goal.currentAmount.gte(goal.targetAmount),
      created_at: serializeDate(goal.createdAt),
      updated_at: serializeDate(goal.updatedAt),
      links: {
        accounts: goal.accountId ? [serializeBigInt(goal.accountId)] : []
      }
    };
  }
}

function extractImageName(url: string | null): string | null {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1];
}
```

### 5.3 Cashflow Serializer

```typescript
export function serializeBill(bill: CashflowBill): any {
  return {
    id: serializeBigInt(bill.id),
    user_id: serializeBigInt(bill.userId),
    name: bill.name,
    amount: serializeDecimal(bill.amount),
    due_date: bill.dueDate,
    recurrence: bill.recurrence,
    category_id: bill.categoryId ? serializeBigInt(bill.categoryId) : null,
    account_id: bill.accountId ? serializeBigInt(bill.accountId) : null,
    active: bill.active,
    stopped_at: bill.stoppedAt ? serializeDate(bill.stoppedAt) : null,
    created_at: serializeDate(bill.createdAt),
    updated_at: serializeDate(bill.updatedAt),
    links: {
      category: bill.categoryId ? serializeBigInt(bill.categoryId) : null,
      account: bill.accountId ? serializeBigInt(bill.accountId) : null
    }
  };
}

export function serializeCashflowEvent(event: CashflowEvent): any {
  return {
    id: serializeBigInt(event.id),
    user_id: serializeBigInt(event.userId),
    source_type: event.sourceType,
    source_id: event.sourceId ? serializeBigInt(event.sourceId) : null,
    name: event.name,
    amount: serializeDecimal(event.amount),
    event_date: serializeDateOnly(event.eventDate),
    event_type: event.eventType,
    account_id: event.accountId ? serializeBigInt(event.accountId) : null,
    processed: event.processed,
    metadata: event.metadata
  };
}
```

---

## 6. Middleware Components

### 6.1 Error Handling Middleware

```typescript
// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log error
  logger.error({
    error: err,
    statusCode,
    path: req.path,
    method: req.method
  }, 'Request error');

  // Send response
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
}

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    error: 'Not found'
  });
}
```

### 6.2 Validation Middleware

```typescript
// src/middleware/validation.ts

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      next(error);
    }
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid parameters',
          details: error.errors
        });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors
        });
        return;
      }
      next(error);
    }
  };
}
```

---

## 7. Utility Components

### 7.1 Date Utilities

```typescript
// src/utils/dateUtils.ts

export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return { start, end };
}

export function getLastMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  return { start, end };
}

export function getLast30DaysRange(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return { start, end };
}

export function getNext90DaysRange(): { start: Date; end: Date } {
  const start = new Date();
  const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return { start, end };
}
```

### 7.2 Pagination Utilities

```typescript
// src/utils/pagination.ts

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  totalPages: number;
  totalCount: number;
}

export function parsePaginationParams(query: any): Required<PaginationParams> {
  const page = Math.max(1, parseInt(query.page) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 25));

  return { page, perPage };
}

export function calculatePaginationMeta(
  totalCount: number,
  params: Required<PaginationParams>
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / params.perPage);

  return {
    currentPage: params.page,
    perPage: params.perPage,
    totalPages,
    totalCount
  };
}

export function applyPagination<T>(
  data: T[],
  params: Required<PaginationParams>
): PaginatedResult<T> {
  const skip = (params.page - 1) * params.perPage;
  const paginatedData = data.slice(skip, skip + params.perPage);

  return {
    data: paginatedData,
    meta: calculatePaginationMeta(data.length, params)
  };
}
```

---

## 8. Testing Components

### 8.1 Test Utilities

```typescript
// tests/utils/testHelpers.ts

import { prisma } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../src/config/auth';

export async function createTestUser(overrides = {}) {
  return await prisma.user.create({
    data: {
      partnerId: BigInt(1),
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      timezone: 'America/New_York',
      ...overrides
    }
  });
}

export async function createTestAccount(userId: bigint, overrides = {}) {
  return await prisma.account.create({
    data: {
      userId,
      partnerId: BigInt(1),
      name: 'Test Account',
      accountType: 'checking',
      balance: 1000.00,
      state: 'active',
      ...overrides
    }
  });
}

export function generateJWT(user: any): string {
  return jwt.sign(
    {
      userId: Number(user.id),
      partnerId: Number(user.partnerId)
    },
    authConfig.jwtSecret,
    { expiresIn: '15m' }
  );
}

export async function cleanupTestData() {
  await prisma.goal.deleteMany({ where: { userId: { gt: BigInt(1000) } } });
  await prisma.transaction.deleteMany({ where: { userId: { gt: BigInt(1000) } } });
  await prisma.account.deleteMany({ where: { userId: { gt: BigInt(1000) } } });
  await prisma.user.deleteMany({ where: { id: { gt: BigInt(1000) } } });
}
```

### 8.2 Test Fixtures

```typescript
// tests/fixtures/goals.ts

export const mockPayoffGoal = {
  name: 'Pay off credit card',
  current_value: '5000.00',
  account_id: '123',
  target_completion_on: '2026-12-31',
  monthly_contribution: '150.00',
  image_name: 'credit_card.jpg'
};

export const mockSavingsGoal = {
  name: 'Emergency Fund',
  target_value: '10000.00',
  current_value: '2500.00',
  account_id: '123',
  target_completion_on: '2026-06-30',
  monthly_contribution: '500.00',
  image_name: 'emergency_fund.jpg'
};
```

---

## Appendix A: Component Checklist

**Priority 1 Components**:
- [ ] goalsController.ts
- [ ] goalService.ts
- [ ] goalSchemas.ts (validation)
- [ ] Goal serializers
- [ ] accountsController.ts (POST endpoint)
- [ ] transactionsController.ts (POST endpoint)
- [ ] tagsController.ts
- [ ] tagService.ts
- [ ] Tag serializers

**Priority 2 Components**:
- [ ] cashflowController.ts
- [ ] cashflowService.ts
- [ ] cashflowSchemas.ts
- [ ] Cashflow serializers
- [ ] alertsController.ts
- [ ] alertService.ts
- [ ] alertSchemas.ts
- [ ] Alert serializers
- [ ] expensesController.ts
- [ ] expenseService.ts (expand)
- [ ] networthController.ts
- [ ] networthService.ts (new)
- [ ] calculationService.ts (shared)

**Utility Components**:
- [ ] dateUtils.ts
- [ ] paginationUtils.ts
- [ ] validationMiddleware.ts
- [ ] testHelpers.ts

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-04
**Status**: Complete Component Specification
**Implementation Ready**: Yes
