# Frontend-Backend Integration Specification
## responsive-tiles ↔ pfm-backend-simulator Field Mapping

**Date**: 2025-10-04
**Purpose**: Ensure 100% field compatibility between responsive-tiles frontend and pfm-backend-simulator backend
**Status**: Complete field mapping for all 86 endpoints

---

## Table of Contents

1. [Integration Architecture](#integration-architecture)
2. [Common Patterns](#common-patterns)
3. [Goals Module Integration](#goals-module-integration)
4. [Cashflow Module Integration](#cashflow-module-integration)
5. [Alerts Module Integration](#alerts-module-integration)
6. [Accounts Module Integration](#accounts-module-integration)
7. [Transactions Module Integration](#transactions-module-integration)
8. [Budgets Module Integration](#budgets-module-integration)
9. [Tags Module Integration](#tags-module-integration)
10. [Expenses Module Integration](#expenses-module-integration)
11. [Networth Module Integration](#networth-module-integration)
12. [Field Transformation Rules](#field-transformation-rules)
13. [Gap Analysis](#gap-analysis)
14. [Testing Strategy](#testing-strategy)

---

## 1. Integration Architecture

### Request Flow
```
responsive-tiles → JWT Auth → Express Router → Controller → Service → Prisma → PostgreSQL
                                                   ↓
                                              Serializer
                                                   ↓
                                            Snake_case JSON
                                                   ↓
                                          responsive-tiles
```

### Authentication Flow
```typescript
// Frontend sends JWT in two formats:
// 1. Query parameter: /api/v2/users/:userId/goals?jwt=xxx&userId=123
// 2. Authorization header: Bearer xxx

// Backend extracts and validates:
interface JWTContext {
  userId: bigint;
  partnerId: bigint;
  exp: number;
}
```

### Response Format Requirements

**All responses MUST follow geezeo RABL serialization format:**

1. **Resource Wrapping**: Single resource in singular key, collections in plural key
   ```json
   { "payoff_goal": {...} }  // Single
   { "payoff_goals": [...] } // Collection
   ```

2. **Snake_case Keys**: All field names in snake_case
   ```json
   { "current_value": "500.00", "target_completion_on": "2026-12-31" }
   ```

3. **Links Object**: Relationships in separate `links` key
   ```json
   {
     "links": {
       "accounts": [123, 456],
       "category": 789
     }
   }
   ```

4. **Data Type Conventions**:
   - **Currency**: String with 2 decimal places (`"500.00"`)
   - **Dates**: ISO 8601 format (`"2025-10-04T12:00:00Z"`)
   - **Date-only**: YYYY-MM-DD (`"2025-10-04"`)
   - **IDs**: Numeric (not string) for consistency with frontend expectations
   - **BigInt**: Convert to Number for JSON serialization
   - **Decimal**: Convert to String with 2 decimal precision

---

## 2. Common Patterns

### 2.1 Serialization Utilities

```typescript
// src/utils/serializers.ts

// Convert BigInt to Number (safe for IDs < 2^53)
export function serializeBigInt(value: bigint | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

// Convert Decimal to String with 2 decimals
export function serializeDecimal(value: Decimal): string {
  return value.toFixed(2);
}

// Convert Date to ISO 8601 string
export function serializeDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

// Convert Date to YYYY-MM-DD
export function serializeDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

// Extract image name from URL
export function extractImageName(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.split('/').pop() || null;
}

// Convert camelCase object to snake_case (recursive)
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== 'object') return obj;

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {} as any);
}
```

### 2.2 Standard Controller Pattern

```typescript
// Every controller follows this pattern:
export async function controllerAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract & validate parameters
    const userId = BigInt(req.params.userId);

    // 2. Authorization check (userId matches JWT context)
    if (userId !== req.context.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // 3. Call service layer
    const data = await service.method(userId, params);

    // 4. Serialize response
    const serialized = serializeData(data);

    // 5. Send response with proper wrapping
    res.status(200).json({
      resource_name: serialized // or resource_names for arrays
    });
  } catch (error) {
    // 6. Error handling
    logger.error({ error, context }, 'Operation failed');
    next(error); // Delegate to error middleware
  }
}
```

### 2.3 Standard Service Pattern

```typescript
// Every service follows this pattern:
export async function serviceMethod(
  userId: bigint,
  data: InputType
): Promise<OutputType> {
  // 1. Validate ownership/authorization
  const resource = await prisma.resource.findFirst({
    where: { id: data.id, userId, deletedAt: null }
  });

  if (!resource) {
    throw new Error('Resource not found or access denied');
  }

  // 2. Perform business logic
  const result = await prisma.resource.create/update/delete({
    where: { ... },
    data: { ... }
  });

  // 3. Return result (serialization in controller)
  return result;
}
```

---

## 3. Goals Module Integration

### 3.1 Payoff Goals

#### Frontend API Client (responsive-tiles)
```javascript
// src/api/goals.js

export const getPayoffGoals = (userId) =>
  get(`/api/v2/users/${userId}/payoff_goals`);

export const getPayoffGoal = (userId, goalId) =>
  get(`/api/v2/users/${userId}/payoff_goals/${goalId}`);

export const createPayoffGoal = (userId, goalData) =>
  post(`/api/v2/users/${userId}/payoff_goals`, { payoff_goal: goalData });

export const updatePayoffGoal = (userId, goalId, updates) =>
  put(`/api/v2/users/${userId}/payoff_goals/${goalId}`, { payoff_goal: updates });

export const deletePayoffGoal = (userId, goalId) =>
  del(`/api/v2/users/${userId}/payoff_goals/${goalId}`);

export const archivePayoffGoal = (userId, goalId) =>
  put(`/api/v2/users/${userId}/payoff_goals/${goalId}/archive`);
```

#### Backend Endpoint Mapping

| Frontend Call | Backend Endpoint | Controller | Service |
|---------------|------------------|------------|---------|
| `getPayoffGoals(userId)` | `GET /api/v2/users/:userId/payoff_goals` | `listPayoffGoals` | `getPayoffGoals` |
| `getPayoffGoal(userId, id)` | `GET /api/v2/users/:userId/payoff_goals/:id` | `getPayoffGoal` | `getPayoffGoalById` |
| `createPayoffGoal(userId, data)` | `POST /api/v2/users/:userId/payoff_goals` | `createPayoffGoal` | `createPayoffGoal` |
| `updatePayoffGoal(userId, id, data)` | `PUT /api/v2/users/:userId/payoff_goals/:id` | `updatePayoffGoal` | `updatePayoffGoal` |
| `deletePayoffGoal(userId, id)` | `DELETE /api/v2/users/:userId/payoff_goals/:id` | `deletePayoffGoal` | `deletePayoffGoal` |
| `archivePayoffGoal(userId, id)` | `PUT /api/v2/users/:userId/payoff_goals/:id/archive` | `archivePayoffGoal` | `archivePayoffGoal` |

#### Field Mapping: Payoff Goal Response

**Frontend Expects**:
```javascript
{
  payoff_goal: {
    id: 123,                              // Number
    user_id: 456,                         // Number
    name: "Pay off credit card",          // String
    state: "active",                      // "active" | "archived"
    status: "under",                      // "under" | "on_track" | "over"
    percent_complete: 35.5,               // Number (0-100)
    initial_value: "5000.00",             // String (currency)
    current_value: "3225.00",             // String (currency)
    target_value: "0.00",                 // String (always "0.00" for payoff)
    monthly_contribution: "150.00",       // String (currency, optional)
    target_completion_on: "2026-12-31",   // String (YYYY-MM-DD, optional)
    image_name: "credit_card.jpg",        // String (optional)
    image_url: "https://...",             // String (full URL, optional)
    complete: false,                      // Boolean
    created_at: "2025-10-04T12:00:00Z",   // String (ISO 8601)
    updated_at: "2025-10-04T12:00:00Z",   // String (ISO 8601)
    links: {
      accounts: [789]                     // Array<Number>
    }
  }
}
```

**Backend Database Schema (Prisma)**:
```prisma
model Goal {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  goalType        GoalType  // 'payoff' | 'savings'
  name            String
  targetAmount    Decimal   @db.Decimal(12, 2)  // Always 0 for payoff
  currentAmount   Decimal   @db.Decimal(12, 2)
  accountId       BigInt?   @map("account_id")
  targetDate      DateTime? @map("target_date")
  imageUrl        String?   @map("image_url")
  metadata        Json      @default("{}")
  archivedAt      DateTime? @map("archived_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")
}
```

**Backend Serialization (serializeGoal)**:
```typescript
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
      status,  // Calculated: "under" | "on_track" | "over"
      percent_complete: progress,  // Calculated from current vs initial
      initial_value: metadata.initialValue || serializeDecimal(goal.currentAmount),
      current_value: serializeDecimal(goal.currentAmount),
      target_value: '0.00',  // Always 0.00 for payoff goals
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
  }
  // ... savings goal handling
}

// Helper: Calculate progress percentage
function calculateProgress(goal: Goal): number {
  const metadata = goal.metadata as any;
  const initialValue = metadata.initialValue
    ? new Decimal(metadata.initialValue)
    : goal.currentAmount;

  if (goal.goalType === 'payoff') {
    // For payoff: progress = (initial - current) / initial * 100
    if (initialValue.lte(0)) return 100;
    const paid = initialValue.sub(goal.currentAmount);
    return Math.min(100, Math.max(0, paid.div(initialValue).mul(100).toNumber()));
  } else {
    // For savings: progress = current / target * 100
    if (goal.targetAmount.lte(0)) return 0;
    return Math.min(100, Math.max(0, goal.currentAmount.div(goal.targetAmount).mul(100).toNumber()));
  }
}

// Helper: Calculate status
function calculateStatus(goal: Goal): 'under' | 'on_track' | 'over' {
  const progress = calculateProgress(goal);

  if (!goal.targetDate) return 'on_track';

  const now = new Date();
  const target = new Date(goal.targetDate);
  const metadata = goal.metadata as any;
  const startDate = goal.createdAt;

  const totalDays = Math.floor((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (totalDays <= 0) return 'on_track';

  const expectedProgress = (elapsedDays / totalDays) * 100;

  if (progress < expectedProgress - 10) return 'under';
  if (progress > expectedProgress + 10) return 'over';
  return 'on_track';
}
```

#### Field Mapping: Payoff Goal Request (Create)

**Frontend Sends**:
```javascript
{
  payoff_goal: {
    name: "Pay off credit card",
    current_value: "5000.00",      // String (required)
    account_id: 789,               // Number or String (required)
    target_completion_on: "2026-12-31",  // String YYYY-MM-DD (optional)
    monthly_contribution: "150.00",      // String (optional)
    image_url: "https://...",            // String (optional)
    image_name: "credit_card.jpg"        // String (optional, derived from URL)
  }
}
```

**Backend Receives & Validates**:
```typescript
// Zod validation schema
export const PayoffGoalCreateSchema = z.object({
  name: z.string().min(1).max(255),
  current_value: z.string().regex(/^\d+(\.\d{2})?$/, 'Must be decimal with 2 places'),
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)),
  target_completion_on: z.string().datetime().optional(),
  monthly_contribution: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  image_url: z.string().url().optional(),
  image_name: z.string().optional()
});

// Service layer creates Goal
export async function createPayoffGoal(
  userId: bigint,
  data: CreatePayoffGoalData
): Promise<Goal> {
  // Validate account ownership
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId, deletedAt: null }
  });

  if (!account) {
    throw new Error('Account not found or does not belong to user');
  }

  return await prisma.goal.create({
    data: {
      userId,
      goalType: 'payoff',
      name: data.name,
      targetAmount: new Decimal(0),  // Payoff always targets 0
      currentAmount: new Decimal(data.currentValue),
      accountId: data.accountId,
      targetDate: data.targetCompletionOn ? new Date(data.targetCompletionOn) : null,
      imageUrl: data.imageUrl || null,
      metadata: {
        initialValue: data.currentValue,  // Store initial for progress calc
        monthlyContribution: data.monthlyContribution || '0.00'
      }
    }
  });
}
```

### 3.2 Savings Goals

Field mapping is similar to Payoff Goals with these differences:

**Key Differences**:
```javascript
{
  savings_goal: {
    // ... same fields as payoff_goal, except:
    target_value: "10000.00",  // Actual target amount (not "0.00")
    complete: false,           // true when current_value >= target_value
    // progress = current_value / target_value * 100
  }
}
```

**Backend Serialization Difference**:
```typescript
} else {
  // Savings goal
  return {
    // ... same fields
    target_value: serializeDecimal(goal.targetAmount),  // Actual target
    complete: goal.currentAmount.gte(goal.targetAmount),  // >= target
    // ...
  };
}
```

**Backend Create Difference**:
```typescript
export async function createSavingsGoal(
  userId: bigint,
  data: CreateSavingsGoalData
): Promise<Goal> {
  return await prisma.goal.create({
    data: {
      userId,
      goalType: 'savings',  // Different type
      name: data.name,
      targetAmount: new Decimal(data.targetValue),  // Actual target
      currentAmount: new Decimal(data.currentValue || '0.00'),
      accountId: data.accountId,
      targetDate: data.targetCompletionOn ? new Date(data.targetCompletionOn) : null,
      imageUrl: data.imageUrl || null,
      metadata: {
        initialValue: data.currentValue || '0.00',
        monthlyContribution: data.monthlyContribution || '0.00'
      }
    }
  });
}
```

### 3.3 Goal Images Endpoints

**Frontend Expects**:
```javascript
// GET /api/v2/payoff_goals
{
  payoff_goals: [
    {
      id: "credit_card",
      name: "Credit Card",
      image_url: "https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg"
    },
    // ... more image options
  ]
}

// GET /api/v2/savings_goals
{
  savings_goals: [
    {
      id: "vacation",
      name: "Vacation",
      image_url: "https://content.geezeo.com/images/savings_goal_images/vacation.jpg"
    },
    // ... more image options
  ]
}
```

**Backend Implementation**:
```typescript
// Static list of goal images
const PAYOFF_GOAL_IMAGES = [
  { id: 'credit_card', name: 'Credit Card', image_url: 'https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg' },
  { id: 'student_loan', name: 'Student Loan', image_url: 'https://content.geezeo.com/images/payoff_goal_images/student_loan.jpg' },
  { id: 'car_loan', name: 'Car Loan', image_url: 'https://content.geezeo.com/images/payoff_goal_images/car_loan.jpg' },
  { id: 'mortgage', name: 'Mortgage', image_url: 'https://content.geezeo.com/images/payoff_goal_images/mortgage.jpg' },
];

const SAVINGS_GOAL_IMAGES = [
  { id: 'vacation', name: 'Vacation', image_url: 'https://content.geezeo.com/images/savings_goal_images/vacation.jpg' },
  { id: 'emergency_fund', name: 'Emergency Fund', image_url: 'https://content.geezeo.com/images/savings_goal_images/emergency_fund.jpg' },
  { id: 'down_payment', name: 'Down Payment', image_url: 'https://content.geezeo.com/images/savings_goal_images/down_payment.jpg' },
  { id: 'retirement', name: 'Retirement', image_url: 'https://content.geezeo.com/images/savings_goal_images/retirement.jpg' },
];

export async function listPayoffGoalImages(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    payoff_goals: PAYOFF_GOAL_IMAGES
  });
}

export async function listSavingsGoalImages(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    savings_goals: SAVINGS_GOAL_IMAGES
  });
}
```

---

## 4. Cashflow Module Integration

### 4.1 Cashflow Summary

#### Frontend API Client
```javascript
// src/api/cashflow.js

export const getCashflow = (userId, params) =>
  get(`/api/v2/users/${userId}/cashflow`, params);
// params: { start_date, end_date, projection_days }

export const updateCashflowSettings = (userId, settings) =>
  put(`/api/v2/users/${userId}/cashflow`, { cashflow: settings });
```

#### Field Mapping: Cashflow Summary Response

**Frontend Expects**:
```javascript
{
  cashflow: {
    average_income: "3500.00",           // String (currency)
    average_expenses: "2800.00",         // String (currency)
    average_net: "700.00",               // String (currency)
    start_date: "2025-10-01",            // String (YYYY-MM-DD)
    end_date: "2025-10-31",              // String (YYYY-MM-DD)
    events: [
      {
        id: 123,
        name: "Paycheck",
        amount: "1750.00",
        event_date: "2025-10-15",
        event_type: "income",              // "income" | "expense"
        source_type: "income",             // "income" | "bill" | "transaction"
        source_id: 456,
        account_id: 789,
        processed: false
      },
      // ... more events
    ],
    bills: [
      {
        id: 111,
        name: "Rent",
        amount: "1200.00",
        due_date: 1,                       // Day of month (1-31)
        recurrence: "monthly",
        active: true,
        category_id: 222,
        account_id: 333
      },
      // ... more bills
    ],
    incomes: [
      {
        id: 444,
        name: "Salary",
        amount: "3500.00",
        receive_date: 15,                  // Day of month (1-31)
        recurrence: "biweekly",
        active: true,
        category_id: 555,
        account_id: 666
      },
      // ... more incomes
    ]
  }
}
```

**Backend Database Schemas**:
```prisma
model CashflowBill {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  dueDate         Int       @map("due_date")  // 1-31
  recurrence      String    @default("monthly")  // "monthly" | "biweekly" | "weekly"
  categoryId      BigInt?   @map("category_id")
  accountId       BigInt?   @map("account_id")
  active          Boolean   @default(true)
  stoppedAt       DateTime? @map("stopped_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")
}

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
}

model CashflowEvent {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  sourceType      String    @map("source_type")  // "bill" | "income" | "transaction"
  sourceId        BigInt?   @map("source_id")
  name            String
  amount          Decimal   @db.Decimal(12, 2)
  eventDate       DateTime  @map("event_date") @db.Date
  eventType       String    @map("event_type")  // "income" | "expense"
  accountId       BigInt?   @map("account_id")
  processed       Boolean   @default(false)
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")
}
```

**Backend Serialization**:
```typescript
export function serializeCashflowSummary(summary: CashflowSummary): any {
  return {
    average_income: serializeDecimal(summary.averageIncome),
    average_expenses: serializeDecimal(summary.averageExpenses),
    average_net: serializeDecimal(summary.averageNet),
    start_date: serializeDateOnly(summary.startDate),
    end_date: serializeDateOnly(summary.endDate),
    events: summary.events.map(serializeCashflowEvent),
    bills: summary.bills.map(serializeBill),
    incomes: summary.incomes.map(serializeIncome)
  };
}

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

export function serializeIncome(income: CashflowIncome): any {
  return {
    id: serializeBigInt(income.id),
    user_id: serializeBigInt(income.userId),
    name: income.name,
    amount: serializeDecimal(income.amount),
    receive_date: income.receiveDate,
    recurrence: income.recurrence,
    category_id: income.categoryId ? serializeBigInt(income.categoryId) : null,
    account_id: income.accountId ? serializeBigInt(income.accountId) : null,
    active: income.active,
    stopped_at: income.stoppedAt ? serializeDate(income.stoppedAt) : null,
    created_at: serializeDate(income.createdAt),
    updated_at: serializeDate(income.updatedAt),
    links: {
      category: income.categoryId ? serializeBigInt(income.categoryId) : null,
      account: income.accountId ? serializeBigInt(income.accountId) : null
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

**Backend Service Logic**:
```typescript
export async function getCashflowSummary(
  userId: bigint,
  params: {
    startDate?: Date;
    endDate?: Date;
    projectionDays?: number;
  }
): Promise<CashflowSummary> {
  // Default to current month if not specified
  const startDate = params.startDate || getFirstDayOfMonth(new Date());
  const endDate = params.endDate || getLastDayOfMonth(new Date());
  const projectionDays = params.projectionDays || 30;

  // Fetch bills and incomes
  const bills = await prisma.cashflowBill.findMany({
    where: { userId, deletedAt: null, active: true }
  });

  const incomes = await prisma.cashflowIncome.findMany({
    where: { userId, deletedAt: null, active: true }
  });

  // Generate events from bills and incomes
  const events = await generateCashflowEvents(
    userId,
    bills,
    incomes,
    startDate,
    endDate,
    projectionDays
  );

  // Calculate averages
  const totalIncome = events
    .filter(e => e.eventType === 'income')
    .reduce((sum, e) => sum.add(e.amount), new Decimal(0));

  const totalExpenses = events
    .filter(e => e.eventType === 'expense')
    .reduce((sum, e) => sum.add(e.amount), new Decimal(0));

  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const months = days / 30;

  return {
    averageIncome: totalIncome.div(months),
    averageExpenses: totalExpenses.div(months),
    averageNet: totalIncome.sub(totalExpenses).div(months),
    startDate,
    endDate,
    events,
    bills,
    incomes
  };
}

// Generate recurring events from bills and incomes
async function generateCashflowEvents(
  userId: bigint,
  bills: CashflowBill[],
  incomes: CashflowIncome[],
  startDate: Date,
  endDate: Date,
  projectionDays: number
): Promise<CashflowEvent[]> {
  const events: CashflowEvent[] = [];
  const projectUntil = new Date(endDate.getTime() + projectionDays * 24 * 60 * 60 * 1000);

  // Generate bill events
  for (const bill of bills) {
    const billEvents = projectRecurringItem(
      bill,
      'bill',
      'expense',
      startDate,
      projectUntil
    );
    events.push(...billEvents);
  }

  // Generate income events
  for (const income of incomes) {
    const incomeEvents = projectRecurringItem(
      income,
      'income',
      'income',
      startDate,
      projectUntil
    );
    events.push(...incomeEvents);
  }

  // Fetch actual transactions in the range
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      postedAt: { gte: startDate, lte: endDate },
      deletedAt: null
    }
  });

  // Add transaction events
  for (const tx of transactions) {
    events.push({
      id: tx.id,
      userId: tx.userId,
      sourceType: 'transaction',
      sourceId: tx.id,
      name: tx.description || 'Transaction',
      amount: tx.amount.abs(),
      eventDate: tx.postedAt,
      eventType: tx.amount.lt(0) ? 'expense' : 'income',
      accountId: tx.accountId,
      processed: true,
      metadata: {},
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      deletedAt: null
    });
  }

  // Sort by date
  return events.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
}

// Project a recurring item (bill or income) into events
function projectRecurringItem(
  item: CashflowBill | CashflowIncome,
  sourceType: 'bill' | 'income',
  eventType: 'expense' | 'income',
  startDate: Date,
  endDate: Date
): CashflowEvent[] {
  const events: CashflowEvent[] = [];
  const dueDay = 'dueDate' in item ? item.dueDate : item.receiveDate;

  let currentDate = new Date(startDate);
  currentDate.setDate(dueDay);

  // If we're past the due day in start month, move to next occurrence
  if (currentDate < startDate) {
    currentDate = getNextOccurrence(currentDate, item.recurrence);
  }

  while (currentDate <= endDate) {
    events.push({
      id: BigInt(0), // Projected events don't have IDs
      userId: item.userId,
      sourceType,
      sourceId: item.id,
      name: item.name,
      amount: item.amount,
      eventDate: new Date(currentDate),
      eventType,
      accountId: item.accountId || null,
      processed: false,
      metadata: { recurrence: item.recurrence },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    });

    currentDate = getNextOccurrence(currentDate, item.recurrence);
  }

  return events;
}

function getNextOccurrence(date: Date, recurrence: string): Date {
  const next = new Date(date);

  switch (recurrence) {
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next;
}
```

### 4.2 Bills CRUD

#### Frontend API Client
```javascript
export const getBills = (userId) =>
  get(`/api/v2/users/${userId}/cashflow/bills`);

export const createBill = (userId, billData) =>
  post(`/api/v2/users/${userId}/cashflow/bills`, { bill: billData });

export const updateBill = (userId, billId, updates) =>
  put(`/api/v2/users/${userId}/cashflow/bills/${billId}`, { bill: updates });

export const deleteBill = (userId, billId) =>
  del(`/api/v2/users/${userId}/cashflow/bills/${billId}`);

export const stopBill = (userId, billId) =>
  put(`/api/v2/users/${userId}/cashflow/bills/${billId}/stop`);
```

#### Field Mapping: Bill Request (Create)

**Frontend Sends**:
```javascript
{
  bill: {
    name: "Rent",
    amount: "1200.00",        // String (required)
    due_date: 1,              // Number 1-31 (required)
    recurrence: "monthly",    // String (optional, default: "monthly")
    category_id: 222,         // Number (optional)
    account_id: 333          // Number (optional)
  }
}
```

**Backend Validation & Creation**:
```typescript
export const BillSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.string().regex(/^\d+(\.\d{2})?$/),
  due_date: z.number().int().min(1).max(31),
  recurrence: z.enum(['monthly', 'biweekly', 'weekly']).default('monthly'),
  category_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional(),
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional()
});

export async function createBill(
  userId: bigint,
  data: CreateBillData
): Promise<CashflowBill> {
  return await prisma.cashflowBill.create({
    data: {
      userId,
      name: data.name,
      amount: new Decimal(data.amount),
      dueDate: data.dueDate,
      recurrence: data.recurrence || 'monthly',
      categoryId: data.categoryId || null,
      accountId: data.accountId || null,
      active: true
    }
  });
}
```

### 4.3 Incomes CRUD

Similar to Bills with `receiveDate` instead of `dueDate`.

### 4.4 Events Management

**Frontend API Client**:
```javascript
export const getCashflowEvents = (userId, params) =>
  get(`/api/v2/users/${userId}/cashflow/events`, params);

export const updateEvent = (userId, eventId, updates) =>
  put(`/api/v2/users/${userId}/cashflow/events/${eventId}`, { event: updates });

export const deleteEvent = (userId, eventId) =>
  del(`/api/v2/users/${userId}/cashflow/events/${eventId}`);
```

**Note**: Events are mostly generated/projected from bills and incomes. Direct event manipulation is limited to user-created one-off events.

---

## 5. Alerts Module Integration

### 5.1 Alert Types

The frontend supports 6 alert types:
1. **Account Threshold** - Notify when account balance crosses threshold
2. **Goal** - Notify about goal progress milestones
3. **Merchant Name** - Notify when transaction from specific merchant
4. **Spending Target** - Notify when spending exceeds target
5. **Transaction Limit** - Notify when single transaction exceeds limit
6. **Upcoming Bill** - Notify before bill is due

### 5.2 Notifications (Read-Only)

#### Frontend API Client
```javascript
export const getNotifications = (userId) =>
  get(`/api/v2/users/${userId}/alerts/notifications`);

export const getNotification = (userId, notificationId) =>
  get(`/api/v2/users/${userId}/alerts/notifications/${notificationId}`);

export const deleteNotification = (userId, notificationId) =>
  del(`/api/v2/users/${userId}/alerts/notifications/${notificationId}`);
```

#### Field Mapping: Notification Response

**Frontend Expects**:
```javascript
{
  notifications: [
    {
      id: 123,
      user_id: 456,
      alert_id: 789,
      alert_type: "account_threshold",
      title: "Low Balance Alert",
      message: "Your checking account is below $100",
      read: false,
      created_at: "2025-10-04T12:00:00Z",
      links: {
        alert: 789,
        account: 111    // Related resource ID
      }
    }
  ]
}
```

**Backend Schema**:
```prisma
model Notification {
  id          BigInt    @id @default(autoincrement())
  userId      BigInt    @map("user_id")
  alertId     BigInt?   @map("alert_id")
  alertType   String    @map("alert_type")
  title       String
  message     String    @db.Text
  read        Boolean   @default(false)
  metadata    Json      @default("{}")
  createdAt   DateTime  @default(now()) @map("created_at")
  deletedAt   DateTime? @map("deleted_at")
}
```

**Backend Serialization**:
```typescript
export function serializeNotification(notification: Notification): any {
  const metadata = notification.metadata as any;

  return {
    id: serializeBigInt(notification.id),
    user_id: serializeBigInt(notification.userId),
    alert_id: notification.alertId ? serializeBigInt(notification.alertId) : null,
    alert_type: notification.alertType,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    created_at: serializeDate(notification.createdAt),
    links: {
      alert: notification.alertId ? serializeBigInt(notification.alertId) : null,
      ...(metadata.accountId && { account: serializeBigInt(metadata.accountId) }),
      ...(metadata.goalId && { goal: serializeBigInt(metadata.goalId) }),
      ...(metadata.transactionId && { transaction: serializeBigInt(metadata.transactionId) })
    }
  };
}
```

### 5.3 Alert Management

#### Frontend API Client
```javascript
export const getAlerts = (userId) =>
  get(`/api/v2/users/${userId}/alerts`);

export const getAlert = (userId, alertId) =>
  get(`/api/v2/users/${userId}/alerts/${alertId}`);

export const deleteAlert = (userId, alertId) =>
  del(`/api/v2/users/${userId}/alerts/${alertId}`);

export const createAccountThresholdAlert = (userId, alertData) =>
  post(`/api/v2/users/${userId}/alerts/account_thresholds`, { alert: alertData });

export const updateAccountThresholdAlert = (userId, alertId, updates) =>
  put(`/api/v2/users/${userId}/alerts/account_thresholds/${alertId}`, { alert: updates });

// Similar patterns for other alert types
```

#### Field Mapping: Account Threshold Alert

**Frontend Sends (Create)**:
```javascript
{
  alert: {
    name: "Low balance warning",
    account_id: 123,
    threshold: "100.00",           // String
    comparison: "less_than",       // "less_than" | "greater_than"
    email_delivery: true,
    sms_delivery: false
  }
}
```

**Backend Schema**:
```prisma
model Alert {
  id                BigInt    @id @default(autoincrement())
  userId            BigInt    @map("user_id")
  alertType         AlertType // enum
  name              String
  sourceType        String?   @map("source_type")  // "account" | "goal" | etc
  sourceId          BigInt?   @map("source_id")
  conditions        Json      // Type-specific conditions
  emailDelivery     Boolean   @default(true) @map("email_delivery")
  smsDelivery       Boolean   @default(false) @map("sms_delivery")
  active            Boolean   @default(true)
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  deletedAt         DateTime? @map("deleted_at")
}

enum AlertType {
  ACCOUNT_THRESHOLD
  GOAL
  MERCHANT_NAME
  SPENDING_TARGET
  TRANSACTION_LIMIT
  UPCOMING_BILL
}
```

**Backend Validation & Creation**:
```typescript
export const AccountThresholdAlertSchema = z.object({
  name: z.string().min(1).max(255),
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)),
  threshold: z.string().regex(/^\d+(\.\d{2})?$/),
  comparison: z.enum(['less_than', 'greater_than']),
  email_delivery: z.boolean().default(true),
  sms_delivery: z.boolean().default(false)
});

export async function createAccountThresholdAlert(
  userId: bigint,
  data: CreateAccountThresholdAlertData
): Promise<Alert> {
  // Validate account ownership
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId, deletedAt: null }
  });

  if (!account) {
    throw new Error('Account not found');
  }

  return await prisma.alert.create({
    data: {
      userId,
      alertType: 'ACCOUNT_THRESHOLD',
      name: data.name,
      sourceType: 'account',
      sourceId: data.accountId,
      conditions: {
        threshold: data.threshold,
        comparison: data.comparison
      },
      emailDelivery: data.emailDelivery,
      smsDelivery: data.smsDelivery,
      active: true
    }
  });
}
```

**Backend Serialization**:
```typescript
export function serializeAlert(alert: Alert): any {
  const conditions = alert.conditions as any;

  const base = {
    id: serializeBigInt(alert.id),
    user_id: serializeBigInt(alert.userId),
    alert_type: alert.alertType.toLowerCase(),
    name: alert.name,
    email_delivery: alert.emailDelivery,
    sms_delivery: alert.smsDelivery,
    active: alert.active,
    created_at: serializeDate(alert.createdAt),
    updated_at: serializeDate(alert.updatedAt),
    links: {}
  };

  // Type-specific fields
  switch (alert.alertType) {
    case 'ACCOUNT_THRESHOLD':
      return {
        ...base,
        account_id: alert.sourceId ? serializeBigInt(alert.sourceId) : null,
        threshold: conditions.threshold,
        comparison: conditions.comparison,
        links: {
          account: alert.sourceId ? serializeBigInt(alert.sourceId) : null
        }
      };

    case 'GOAL':
      return {
        ...base,
        goal_id: alert.sourceId ? serializeBigInt(alert.sourceId) : null,
        milestone: conditions.milestone,  // e.g., "25", "50", "75", "100"
        links: {
          goal: alert.sourceId ? serializeBigInt(alert.sourceId) : null
        }
      };

    case 'MERCHANT_NAME':
      return {
        ...base,
        merchant_name: conditions.merchantName,
        links: {}
      };

    case 'SPENDING_TARGET':
      return {
        ...base,
        target_amount: conditions.targetAmount,
        category_id: alert.sourceId ? serializeBigInt(alert.sourceId) : null,
        period: conditions.period,  // "daily" | "weekly" | "monthly"
        links: {
          category: alert.sourceId ? serializeBigInt(alert.sourceId) : null
        }
      };

    case 'TRANSACTION_LIMIT':
      return {
        ...base,
        limit_amount: conditions.limitAmount,
        links: {}
      };

    case 'UPCOMING_BILL':
      return {
        ...base,
        bill_id: alert.sourceId ? serializeBigInt(alert.sourceId) : null,
        days_before: conditions.daysBefore,
        links: {
          bill: alert.sourceId ? serializeBigInt(alert.sourceId) : null
        }
      };

    default:
      return base;
  }
}
```

### 5.4 Alert Destinations

**Frontend Expects**:
```javascript
// GET /api/v2/users/:userId/alerts/destinations
{
  destinations: {
    email: "user@example.com",
    sms: "+15551234567",
    email_verified: true,
    sms_verified: false
  }
}

// PUT /api/v2/users/:userId/alerts/destinations
// Request:
{
  destinations: {
    email: "newemail@example.com",
    sms: "+15559876543"
  }
}
```

**Backend Implementation**:
```typescript
// Store in User.preferences JSON field
export async function getAlertDestinations(userId: bigint): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, preferences: true }
  });

  const prefs = user.preferences as any;

  return {
    email: user.email || null,
    sms: prefs.alertSmsNumber || null,
    email_verified: prefs.emailVerified || false,
    sms_verified: prefs.smsVerified || false
  };
}

export async function updateAlertDestinations(
  userId: bigint,
  data: { email?: string; sms?: string }
): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true }
  });

  const prefs = user.preferences as any;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.email && { email: data.email }),
      preferences: {
        ...prefs,
        ...(data.sms && { alertSmsNumber: data.sms }),
        ...(data.email && { emailVerified: false }),  // Reset verification
        ...(data.sms && { smsVerified: false })
      }
    }
  });

  return getAlertDestinations(userId);
}
```

---

## 6. Accounts Module Integration

### Field Mapping: Account Response

**Frontend Expects**:
```javascript
{
  account: {
    id: 123,
    user_id: 456,
    partner_id: 789,
    name: "Checking Account",
    display_name: "My Checking",
    account_type: "checking",
    balance: "1234.56",
    state: "active",              // "active" | "inactive" | "pending" | "deleted"
    include_in_networth: true,
    include_in_cashflow: true,
    include_in_budget: true,
    institution_name: "Bank of America",
    account_number: "****1234",   // Masked
    routing_number: null,
    available_balance: "1200.00",
    currency: "USD",
    ordering: 1,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-10-04T12:00:00Z",
    links: {
      transactions: "/api/v2/users/456/accounts/123/transactions"
    }
  }
}
```

**Backend Schema** (already exists in Prisma):
```prisma
model Account {
  id                          BigInt       @id @default(autoincrement())
  userId                      BigInt       @map("user_id")
  partnerId                   BigInt       @map("partner_id")
  name                        String
  displayName                 String?      @map("display_name")
  number                      String?
  accountType                 AccountType  @map("account_type")
  balance                     Decimal      @db.Decimal(12, 2)
  state                       AccountState
  includeInNetworth           Boolean      @default(true) @map("include_in_networth")
  includeInCashflow           Boolean      @default(true) @map("include_in_cashflow")
  includeInBudget             Boolean      @default(true) @map("include_in_budget")
  institutionName             String?      @map("institution_name")
  routingNumber               String?      @map("routing_number")
  availableBalance            Decimal?     @db.Decimal(12, 2) @map("available_balance")
  currency                    String       @default("USD")
  ordering                    Int          @default(0)
  metadata                    Json         @default("{}")
  createdAt                   DateTime     @default(now()) @map("created_at")
  updatedAt                   DateTime     @updatedAt @map("updated_at")
  deletedAt                   DateTime?    @map("deleted_at")
}
```

**Backend Serialization** (already implemented):
```typescript
export function serializeAccount(account: Account): any {
  return {
    id: serializeBigInt(account.id),
    user_id: serializeBigInt(account.userId),
    partner_id: serializeBigInt(account.partnerId),
    name: account.name,
    display_name: account.displayName,
    account_type: account.accountType.toLowerCase(),
    balance: serializeDecimal(account.balance),
    state: account.state.toLowerCase(),
    include_in_networth: account.includeInNetworth,
    include_in_cashflow: account.includeInCashflow,
    include_in_budget: account.includeInBudget,
    institution_name: account.institutionName,
    account_number: account.number ? maskAccountNumber(account.number) : null,
    routing_number: account.routingNumber,
    available_balance: account.availableBalance ? serializeDecimal(account.availableBalance) : null,
    currency: account.currency,
    ordering: account.ordering,
    created_at: serializeDate(account.createdAt),
    updated_at: serializeDate(account.updatedAt),
    links: {
      transactions: `/api/v2/users/${account.userId}/accounts/${account.id}/transactions`
    }
  };
}

function maskAccountNumber(number: string): string {
  if (number.length <= 4) return number;
  return '****' + number.slice(-4);
}
```

### Missing Endpoint: POST /accounts

**Frontend Sends**:
```javascript
{
  account: {
    name: "New Savings",
    account_type: "savings",
    balance: "5000.00",
    institution_name: "Chase",
    account_number: "1234567890",
    include_in_networth: true,
    include_in_cashflow: false,
    include_in_budget: false
  }
}
```

**Backend Implementation Needed**:
```typescript
export const AccountCreateSchema = z.object({
  name: z.string().min(1).max(255),
  account_type: z.enum(['checking', 'savings', 'credit_card', 'investment', 'loan', 'other']),
  balance: z.string().regex(/^-?\d+(\.\d{2})?$/),
  institution_name: z.string().optional(),
  account_number: z.string().optional(),
  routing_number: z.string().optional(),
  include_in_networth: z.boolean().default(true),
  include_in_cashflow: z.boolean().default(true),
  include_in_budget: z.boolean().default(true)
});

export async function createAccount(
  userId: bigint,
  partnerId: bigint,
  data: CreateAccountData
): Promise<Account> {
  return await prisma.account.create({
    data: {
      userId,
      partnerId,
      name: data.name,
      displayName: data.name,
      accountType: data.accountType.toUpperCase() as AccountType,
      balance: new Decimal(data.balance),
      state: 'ACTIVE',
      includeInNetworth: data.includeInNetworth,
      includeInCashflow: data.includeInCashflow,
      includeInBudget: data.includeInBudget,
      institutionName: data.institutionName || null,
      number: data.accountNumber || null,
      routingNumber: data.routingNumber || null,
      currency: 'USD',
      ordering: await getNextAccountOrdering(userId)
    }
  });
}

async function getNextAccountOrdering(userId: bigint): Promise<number> {
  const maxOrdering = await prisma.account.aggregate({
    where: { userId, deletedAt: null },
    _max: { ordering: true }
  });

  return (maxOrdering._max.ordering || 0) + 1;
}
```

---

## 7. Transactions Module Integration

### Field Mapping: Transaction Response

**Frontend Expects**:
```javascript
{
  transaction: {
    id: 123,
    user_id: 456,
    account_id: 789,
    description: "Starbucks Coffee",
    amount: "-4.50",              // String, negative for debit
    transaction_type: "debit",    // "debit" | "credit"
    posted_at: "2025-10-04T12:00:00Z",
    primary_tag_id: 111,
    tags: [111, 222],
    memo: "Morning coffee",
    check_number: null,
    merchant_name: "Starbucks",
    category_name: "Dining",
    created_at: "2025-10-04T12:00:00Z",
    updated_at: "2025-10-04T12:00:00Z",
    links: {
      account: 789,
      primary_tag: 111,
      tags: [111, 222]
    }
  }
}
```

**Backend Schema** (already exists):
```prisma
model Transaction {
  id                      BigInt          @id @default(autoincrement())
  userId                  BigInt          @map("user_id")
  accountId               BigInt          @map("account_id")
  description             String?
  amount                  Decimal         @db.Decimal(12, 2)
  transactionType         TransactionType?  @map("transaction_type")
  postedAt                DateTime        @map("posted_at")
  primaryTagId            BigInt?         @map("primary_tag_id")
  metadata                Json            @default("{}")
  createdAt               DateTime        @default(now()) @map("created_at")
  updatedAt               DateTime        @updatedAt @map("updated_at")
  deletedAt               DateTime?       @map("deleted_at")
}
```

**Backend Serialization**:
```typescript
export function serializeTransaction(transaction: Transaction): any {
  const metadata = transaction.metadata as any;

  return {
    id: serializeBigInt(transaction.id),
    user_id: serializeBigInt(transaction.userId),
    account_id: serializeBigInt(transaction.accountId),
    description: transaction.description,
    amount: serializeDecimal(transaction.amount),
    transaction_type: transaction.transactionType?.toLowerCase() || (transaction.amount.lt(0) ? 'debit' : 'credit'),
    posted_at: serializeDate(transaction.postedAt),
    primary_tag_id: transaction.primaryTagId ? serializeBigInt(transaction.primaryTagId) : null,
    tags: metadata.tags || [],
    memo: metadata.memo || null,
    check_number: metadata.checkNumber || null,
    merchant_name: metadata.merchantName || null,
    category_name: metadata.categoryName || null,
    created_at: serializeDate(transaction.createdAt),
    updated_at: serializeDate(transaction.updatedAt),
    links: {
      account: serializeBigInt(transaction.accountId),
      primary_tag: transaction.primaryTagId ? serializeBigInt(transaction.primaryTagId) : null,
      tags: metadata.tags || []
    }
  };
}
```

### Missing Endpoint: POST /transactions

**Frontend Sends**:
```javascript
{
  transaction: {
    account_id: 789,
    description: "Manual entry",
    amount: "-25.00",
    posted_at: "2025-10-04",
    primary_tag_id: 111,
    memo: "Cash withdrawal"
  }
}
```

**Backend Implementation Needed**:
```typescript
export const TransactionCreateSchema = z.object({
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)),
  description: z.string().min(1).max(500),
  amount: z.string().regex(/^-?\d+(\.\d{2})?$/),
  posted_at: z.string().datetime(),
  primary_tag_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional(),
  memo: z.string().max(1000).optional()
});

export async function createTransaction(
  userId: bigint,
  data: CreateTransactionData
): Promise<Transaction> {
  // Validate account ownership
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId, deletedAt: null }
  });

  if (!account) {
    throw new Error('Account not found');
  }

  // Validate tag ownership if provided
  if (data.primaryTagId) {
    const tag = await prisma.tag.findFirst({
      where: {
        id: data.primaryTagId,
        OR: [
          { userId },
          { tagType: 'system' },
          { tagType: 'partner', partnerId: account.partnerId }
        ]
      }
    });

    if (!tag) {
      throw new Error('Tag not found or access denied');
    }
  }

  const amount = new Decimal(data.amount);

  return await prisma.transaction.create({
    data: {
      userId,
      accountId: data.accountId,
      description: data.description,
      amount,
      transactionType: amount.lt(0) ? 'DEBIT' : 'CREDIT',
      postedAt: new Date(data.postedAt),
      primaryTagId: data.primaryTagId || null,
      metadata: {
        ...(data.memo && { memo: data.memo }),
        manual: true  // Flag as manually created
      }
    }
  });
}
```

---

## 8. Budgets Module Integration

### Field Mapping (Already Implemented)

**Frontend Expects**:
```javascript
{
  budget: {
    id: 123,
    user_id: 456,
    name: "Groceries",
    budget_amount: "500.00",
    spent: "347.23",
    state: "under",               // "under" | "risk" | "over"
    month: 10,
    year: 2025,
    show_on_dashboard: true,
    tag_names: ["Groceries", "Food"],
    created_at: "2025-10-01T00:00:00Z",
    updated_at: "2025-10-04T12:00:00Z",
    links: {
      accounts: [789, 101112],
      budget_histories: []
    }
  }
}
```

**Backend** (already implemented correctly):
- Schema: ✅
- Serialization: ✅
- CRUD operations: ✅

**Note**: Budget calculations need to aggregate transactions by tag_names:
```typescript
async function calculateBudgetSpent(budget: Budget): Promise<Decimal> {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get all transactions matching budget criteria
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: budget.userId,
      accountId: budget.accountList.length > 0 ? { in: budget.accountList } : undefined,
      postedAt: { gte: firstDay, lte: lastDay },
      deletedAt: null,
      amount: { lt: 0 }  // Only debits (expenses)
    },
    include: {
      primaryTag: true
    }
  });

  // Filter by tag names
  const matchingTxs = transactions.filter(tx => {
    if (!tx.primaryTag) return false;
    return budget.tagNames.includes(tx.primaryTag.name);
  });

  return matchingTxs.reduce((sum, tx) => sum.add(tx.amount.abs()), new Decimal(0));
}

function calculateBudgetState(budget: Budget, spent: Decimal): string {
  const budgetAmount = budget.budgetAmount;
  const percentage = spent.div(budgetAmount).mul(100);

  if (percentage.gte(100)) return 'over';
  if (percentage.gte(90)) return 'risk';
  return 'under';
}
```

---

## 9. Tags Module Integration

### Field Mapping: Tag Response

**Frontend Expects**:
```javascript
// GET /api/v2/users/:userId/tags
{
  tags: [
    {
      id: 123,
      name: "Groceries",
      parent_tag_id: null,
      tag_type: "system",        // "system" | "user" | "partner"
      transaction_count: 45
    },
    {
      id: 124,
      name: "Organic",
      parent_tag_id: 123,        // Child of Groceries
      tag_type: "user",
      transaction_count: 12
    }
  ]
}

// GET /api/v2/tags (global tags)
{
  tags: [
    {
      id: 1,
      name: "Food & Dining",
      parent_tag_id: null,
      tag_type: "system"
    },
    // ... more system tags
  ]
}
```

**Backend Schema** (already exists):
```prisma
model Tag {
  id           BigInt    @id @default(autoincrement())
  partnerId    BigInt?   @map("partner_id")
  userId       BigInt?   @map("user_id")
  name         String
  parentTagId  BigInt?   @map("parent_tag_id")
  tagType      String    // 'user' | 'system' | 'partner'
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
}
```

**Backend Serialization**:
```typescript
export function serializeTag(tag: Tag, transactionCount?: number): any {
  return {
    id: serializeBigInt(tag.id),
    name: tag.name,
    parent_tag_id: tag.parentTagId ? serializeBigInt(tag.parentTagId) : null,
    tag_type: tag.tagType,
    ...(transactionCount !== undefined && { transaction_count: transactionCount })
  };
}

// GET /api/v2/users/:userId/tags
export async function getUserTags(userId: bigint): Promise<any[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { partner: true }
  });

  // Get all tags accessible to user (system + partner + user's own)
  const tags = await prisma.tag.findMany({
    where: {
      OR: [
        { tagType: 'system' },
        { tagType: 'partner', partnerId: user.partnerId },
        { tagType: 'user', userId }
      ]
    },
    orderBy: { name: 'asc' }
  });

  // Calculate transaction counts
  const tagsWithCounts = await Promise.all(
    tags.map(async (tag) => {
      const count = await prisma.transaction.count({
        where: {
          userId,
          primaryTagId: tag.id,
          deletedAt: null
        }
      });

      return serializeTag(tag, count);
    })
  );

  return tagsWithCounts;
}

// GET /api/v2/tags (global system tags)
export async function getGlobalTags(): Promise<any[]> {
  const systemTags = await prisma.tag.findMany({
    where: { tagType: 'system' },
    orderBy: { name: 'asc' }
  });

  return systemTags.map(tag => serializeTag(tag));
}
```

### Missing Endpoint: PUT /users/:userId/tags

**Frontend Sends**:
```javascript
{
  tags: {
    create: [
      { name: "My Custom Tag", parent_tag_id: 123 }
    ],
    update: [
      { id: 456, name: "Renamed Tag" }
    ],
    delete: [789]
  }
}
```

**Backend Implementation Needed**:
```typescript
export async function updateUserTags(
  userId: bigint,
  operations: {
    create?: Array<{ name: string; parent_tag_id?: number }>;
    update?: Array<{ id: number; name: string }>;
    delete?: number[];
  }
): Promise<any> {
  const results = {
    created: [],
    updated: [],
    deleted: []
  };

  // Create new tags
  if (operations.create) {
    for (const tagData of operations.create) {
      const tag = await prisma.tag.create({
        data: {
          userId,
          name: tagData.name,
          parentTagId: tagData.parent_tag_id ? BigInt(tagData.parent_tag_id) : null,
          tagType: 'user'
        }
      });
      results.created.push(serializeTag(tag));
    }
  }

  // Update existing tags
  if (operations.update) {
    for (const tagData of operations.update) {
      // Verify ownership
      const existing = await prisma.tag.findFirst({
        where: { id: BigInt(tagData.id), userId, tagType: 'user' }
      });

      if (!existing) continue;  // Skip if not owned

      const tag = await prisma.tag.update({
        where: { id: BigInt(tagData.id) },
        data: { name: tagData.name }
      });
      results.updated.push(serializeTag(tag));
    }
  }

  // Delete tags
  if (operations.delete) {
    for (const tagId of operations.delete) {
      // Verify ownership
      const existing = await prisma.tag.findFirst({
        where: { id: BigInt(tagId), userId, tagType: 'user' }
      });

      if (!existing) continue;

      await prisma.tag.delete({
        where: { id: BigInt(tagId) }
      });
      results.deleted.push(tagId);
    }
  }

  return results;
}
```

---

## 10. Expenses Module Integration

### Field Mapping: Expenses Response

**Frontend Expects**:
```javascript
// GET /api/v2/users/:userId/expenses
// GET /api/v2/users/:userId/expenses/this_month
// GET /api/v2/users/:userId/expenses/last_month
// GET /api/v2/users/:userId/expenses/last_thirty_days

{
  expenses: {
    total: "2847.65",
    period_start: "2025-10-01",
    period_end: "2025-10-31",
    categories: [
      {
        category_id: 123,
        category_name: "Groceries",
        total: "456.78",
        transaction_count: 12,
        average: "38.07",
        percent_of_total: 16.05
      },
      {
        category_id: 124,
        category_name: "Dining",
        total: "289.50",
        transaction_count: 8,
        average: "36.19",
        percent_of_total: 10.17
      }
      // ... more categories
    ]
  }
}
```

**Backend Implementation**:
```typescript
export interface ExpensesSummary {
  total: Decimal;
  periodStart: Date;
  periodEnd: Date;
  categories: ExpenseCategory[];
}

export interface ExpenseCategory {
  categoryId: bigint | null;
  categoryName: string;
  total: Decimal;
  transactionCount: number;
  average: Decimal;
  percentOfTotal: number;
}

export function serializeExpenses(expenses: ExpensesSummary): any {
  return {
    total: serializeDecimal(expenses.total),
    period_start: serializeDateOnly(expenses.periodStart),
    period_end: serializeDateOnly(expenses.periodEnd),
    categories: expenses.categories.map(cat => ({
      category_id: cat.categoryId ? serializeBigInt(cat.categoryId) : null,
      category_name: cat.categoryName,
      total: serializeDecimal(cat.total),
      transaction_count: cat.transactionCount,
      average: serializeDecimal(cat.average),
      percent_of_total: cat.percentOfTotal
    }))
  };
}

export async function getExpenses(
  userId: bigint,
  params: {
    period?: 'this_month' | 'last_month' | 'last_thirty_days';
    startDate?: Date;
    endDate?: Date;
  }
): Promise<ExpensesSummary> {
  // Determine date range
  let startDate: Date;
  let endDate: Date;

  if (params.startDate && params.endDate) {
    startDate = params.startDate;
    endDate = params.endDate;
  } else {
    const now = new Date();
    switch (params.period) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'last_thirty_days':
        endDate = new Date();
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }
  }

  // Get all expense transactions (debits)
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      postedAt: { gte: startDate, lte: endDate },
      amount: { lt: 0 },  // Only expenses (negative amounts)
      deletedAt: null
    },
    include: {
      primaryTag: true
    }
  });

  // Group by category (tag)
  const categoryMap = new Map<string, ExpenseCategory>();
  let total = new Decimal(0);

  for (const tx of transactions) {
    const categoryId = tx.primaryTagId;
    const categoryName = tx.primaryTag?.name || 'Uncategorized';
    const key = categoryId ? categoryId.toString() : 'uncategorized';

    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        categoryId: categoryId || null,
        categoryName,
        total: new Decimal(0),
        transactionCount: 0,
        average: new Decimal(0),
        percentOfTotal: 0
      });
    }

    const category = categoryMap.get(key)!;
    const amount = tx.amount.abs();
    category.total = category.total.add(amount);
    category.transactionCount++;
    total = total.add(amount);
  }

  // Calculate averages and percentages
  const categories = Array.from(categoryMap.values()).map(cat => ({
    ...cat,
    average: cat.total.div(cat.transactionCount),
    percentOfTotal: total.gt(0) ? cat.total.div(total).mul(100).toNumber() : 0
  }));

  // Sort by total descending
  categories.sort((a, b) => b.total.cmp(a.total));

  return {
    total,
    periodStart: startDate,
    periodEnd: endDate,
    categories
  };
}
```

---

## 11. Networth Module Integration

### Field Mapping: Networth Response

**Frontend Expects**:
```javascript
// GET /api/v2/users/:userId/networth
{
  networth: {
    total: "125678.90",
    as_of: "2025-10-04T12:00:00Z",
    assets: "150000.00",
    liabilities: "24321.10",
    accounts: [
      {
        account_id: 123,
        account_name: "Checking",
        account_type: "checking",
        balance: "5000.00",
        include_in_networth: true,
        category: "asset"
      },
      {
        account_id: 124,
        account_name: "Credit Card",
        account_type: "credit_card",
        balance: "-1500.00",
        include_in_networth: true,
        category: "liability"
      }
      // ... more accounts
    ]
  }
}
```

**Backend Implementation**:
```typescript
export interface NetworthSummary {
  total: Decimal;
  asOf: Date;
  assets: Decimal;
  liabilities: Decimal;
  accounts: NetworthAccount[];
}

export interface NetworthAccount {
  accountId: bigint;
  accountName: string;
  accountType: string;
  balance: Decimal;
  includeInNetworth: boolean;
  category: 'asset' | 'liability';
}

export function serializeNetworth(networth: NetworthSummary): any {
  return {
    total: serializeDecimal(networth.total),
    as_of: serializeDate(networth.asOf),
    assets: serializeDecimal(networth.assets),
    liabilities: serializeDecimal(networth.liabilities),
    accounts: networth.accounts.map(acc => ({
      account_id: serializeBigInt(acc.accountId),
      account_name: acc.accountName,
      account_type: acc.accountType,
      balance: serializeDecimal(acc.balance),
      include_in_networth: acc.includeInNetworth,
      category: acc.category
    }))
  };
}

export async function calculateNetworth(userId: bigint): Promise<NetworthSummary> {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      deletedAt: null,
      includeInNetworth: true
    }
  });

  let assets = new Decimal(0);
  let liabilities = new Decimal(0);

  const accountsData: NetworthAccount[] = accounts.map(acc => {
    const isAsset = isAssetAccountType(acc.accountType);
    const category = isAsset ? 'asset' : 'liability';

    if (isAsset) {
      assets = assets.add(acc.balance);
    } else {
      liabilities = liabilities.add(acc.balance.abs());
    }

    return {
      accountId: acc.id,
      accountName: acc.displayName || acc.name,
      accountType: acc.accountType.toLowerCase(),
      balance: acc.balance,
      includeInNetworth: acc.includeInNetworth,
      category
    };
  });

  return {
    total: assets.sub(liabilities),
    asOf: new Date(),
    assets,
    liabilities,
    accounts: accountsData
  };
}

function isAssetAccountType(accountType: AccountType): boolean {
  return ['CHECKING', 'SAVINGS', 'INVESTMENT', 'OTHER'].includes(accountType);
}
```

---

## 12. Field Transformation Rules

### 12.1 Naming Conventions

| Source Format | Target Format | Example |
|---------------|---------------|---------|
| Database (snake_case) | JSON (snake_case) | `user_id` → `user_id` |
| Prisma (camelCase) | JSON (snake_case) | `userId` → `user_id` |
| BigInt (database) | Number (JSON) | `123n` → `123` |
| Decimal (database) | String (JSON) | `Decimal("500.00")` → `"500.00"` |
| Date (database) | ISO 8601 (JSON) | `Date()` → `"2025-10-04T12:00:00Z"` |
| Enum (UPPERCASE) | lowercase (JSON) | `CHECKING` → `checking"` |

### 12.2 Data Type Transformations

```typescript
// Currency (always 2 decimal places)
amount: Decimal(500) → "500.00"

// Dates
createdAt: Date(2025-10-04 12:00:00 UTC) → "2025-10-04T12:00:00Z"
targetDate: Date(2025-12-31) → "2025-12-31"

// IDs (BigInt to Number, safe for values < 2^53)
id: 123n → 123

// Booleans (no transformation)
active: true → true

// Arrays
tagNames: ["Food", "Dining"] → ["Food", "Dining"]
accountList: [123n, 456n] → [123, 456]

// Enums
accountType: CHECKING → "checking"
state: ACTIVE → "active"

// Nulls (preserve)
deletedAt: null → null
```

### 12.3 Response Wrapping

```typescript
// Single resource: singular key
{ "payoff_goal": {...} }
{ "account": {...} }
{ "budget": {...} }

// Collection: plural key
{ "payoff_goals": [{...}, {...}] }
{ "accounts": [{...}, {...}] }
{ "budgets": [{...}, {...}] }

// Links: separate object
{
  "payoff_goal": {
    // ... fields
    "links": {
      "accounts": [123, 456]
    }
  }
}
```

### 12.4 Error Response Format

```typescript
// Validation error
{
  "error": "Validation failed",
  "details": [
    { "field": "amount", "message": "Must be a valid decimal" },
    { "field": "name", "message": "Required field" }
  ]
}

// Authorization error
{
  "error": "Forbidden"
}

// Not found error
{
  "error": "Resource not found"
}

// Server error
{
  "error": "Internal server error"
}
```

---

## 13. Gap Analysis

### 13.1 Missing Fields

After analyzing all modules, the following fields need attention:

#### Goals Module
- ✅ All fields mapped correctly
- ⚠️ `initial_value` stored in metadata, ensure it's set on creation
- ⚠️ `monthly_contribution` stored in metadata, optional field

#### Cashflow Module
- ✅ New models defined (CashflowBill, CashflowIncome, CashflowEvent)
- ⚠️ Event generation logic needed for projection
- ⚠️ Recurrence calculation needed (monthly, biweekly, weekly)

#### Alerts Module
- ✅ Base Alert model exists
- ⚠️ Type-specific conditions stored in JSON, ensure correct structure
- ⚠️ Notification generation logic needed (background job)

#### Accounts Module
- ✅ All fields present
- ⚠️ Account number masking needed
- ⚠️ POST /accounts endpoint missing

#### Transactions Module
- ✅ All fields present
- ⚠️ POST /transactions endpoint missing
- ⚠️ Tag relationship handling in metadata

#### Tags Module
- ✅ All fields present
- ⚠️ PUT /tags bulk update endpoint missing
- ⚠️ Transaction count calculation needed

#### Expenses Module
- ⚠️ Entire module missing
- ⚠️ Aggregation logic needed
- ⚠️ Period calculation needed

#### Networth Module
- ⚠️ Entire module missing
- ⚠️ Asset vs liability categorization needed
- ⚠️ Calculation logic needed

### 13.2 Missing Endpoints Summary

| Module | Missing Endpoints | Impact |
|--------|------------------|--------|
| Goals | 12 (all CRUD for payoff & savings) | 🔴 Critical - core feature |
| Cashflow | 15 (bills, incomes, events) | 🟡 Important - planning feature |
| Alerts | 19 (all alert types) | 🟡 Important - engagement feature |
| Accounts | 1 (POST /accounts) | 🔴 Critical - account creation |
| Transactions | 1 (POST /transactions) | 🔴 Critical - manual entry |
| Tags | 1 (PUT /tags) | 🔴 Critical - categorization |
| Expenses | 6 (all endpoints) | 🟡 Important - insights feature |
| Networth | 2 (calculation endpoints) | 🟡 Important - overview feature |

**Total**: 57 endpoints missing

### 13.3 Database Migrations Needed

```prisma
// New models to add to schema.prisma:
model CashflowBill { /* as defined above */ }
model CashflowIncome { /* as defined above */ }
model CashflowEvent { /* as defined above */ }

// Update User model:
model User {
  // ... existing fields
  cashflowBills     CashflowBill[]
  cashflowIncomes   CashflowIncome[]
  cashflowEvents    CashflowEvent[]
}
```

Run migrations:
```bash
npx prisma migrate dev --name add_cashflow_models
```

---

## 14. Testing Strategy

### 14.1 Field Mapping Tests

For each endpoint, test:

```typescript
describe('Payoff Goal Serialization', () => {
  it('should serialize payoff goal with all required fields', async () => {
    const goal = await createTestGoal({ goalType: 'payoff' });
    const serialized = serializeGoal(goal, 'payoff');

    expect(serialized).toMatchObject({
      id: expect.any(Number),
      user_id: expect.any(Number),
      name: expect.any(String),
      state: expect.stringMatching(/^(active|archived)$/),
      status: expect.stringMatching(/^(under|on_track|over)$/),
      percent_complete: expect.any(Number),
      initial_value: expect.stringMatching(/^\d+\.\d{2}$/),
      current_value: expect.stringMatching(/^\d+\.\d{2}$/),
      target_value: '0.00',
      monthly_contribution: expect.stringMatching(/^\d+\.\d{2}$/),
      target_completion_on: expect.any(String),  // or null
      image_name: expect.any(String),  // or null
      image_url: expect.any(String),  // or null
      complete: expect.any(Boolean),
      created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      links: {
        accounts: expect.arrayContaining([expect.any(Number)])
      }
    });
  });

  it('should match exact geezeo format', async () => {
    // Load expected format from HAR capture or geezeo response
    const expected = loadGeezeoResponse('payoff_goal_create.json');
    const goal = await createTestGoal({ goalType: 'payoff' });
    const serialized = serializeGoal(goal, 'payoff');

    // Compare structure (not values, as they'll differ)
    expect(Object.keys(serialized).sort()).toEqual(Object.keys(expected.payoff_goal).sort());
  });
});
```

### 14.2 Integration Tests

```typescript
describe('Goals API Integration', () => {
  it('should complete full CRUD lifecycle', async () => {
    const user = await createTestUser();
    const account = await createTestAccount({ userId: user.id });
    const jwt = generateJWT(user);

    // CREATE
    const createRes = await request(app)
      .post(`/api/v2/users/${user.id}/payoff_goals`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        payoff_goal: {
          name: 'Pay off credit card',
          current_value: '5000.00',
          account_id: account.id
        }
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.payoff_goal).toBeDefined();
    const goalId = createRes.body.payoff_goal.id;

    // READ (single)
    const getRes = await request(app)
      .get(`/api/v2/users/${user.id}/payoff_goals/${goalId}`)
      .set('Authorization', `Bearer ${jwt}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.payoff_goal.name).toBe('Pay off credit card');

    // UPDATE
    const updateRes = await request(app)
      .put(`/api/v2/users/${user.id}/payoff_goals/${goalId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        payoff_goal: {
          current_value: '4500.00'
        }
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.payoff_goal.current_value).toBe('4500.00');

    // ARCHIVE
    const archiveRes = await request(app)
      .put(`/api/v2/users/${user.id}/payoff_goals/${goalId}/archive`)
      .set('Authorization', `Bearer ${jwt}`);

    expect(archiveRes.status).toBe(204);

    // DELETE
    const deleteRes = await request(app)
      .delete(`/api/v2/users/${user.id}/payoff_goals/${goalId}`)
      .set('Authorization', `Bearer ${jwt}`);

    expect(deleteRes.status).toBe(204);
  });
});
```

### 14.3 HAR Replay Tests

```typescript
describe('HAR Replay', () => {
  it('should match all HAR captured endpoints', async () => {
    const harFile = loadHARFile('responsive-tiles-session.har');
    const user = await createTestUser();
    const jwt = generateJWT(user);

    for (const entry of harFile.log.entries) {
      const url = new URL(entry.request.url);

      // Skip non-API calls
      if (!url.pathname.startsWith('/api/v2')) continue;

      const response = await replayHARRequest(entry, { jwt, userId: user.id });

      // Compare structure and status
      expect(response.status).toBe(entry.response.status);

      // Compare response body structure
      const expectedKeys = Object.keys(entry.response.content.text);
      const actualKeys = Object.keys(response.body);
      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    }
  });
});
```

---

## 15. Implementation Checklist

### Phase 1: Core Features (P1)
- [ ] Goals CRUD (14 endpoints)
  - [ ] Payoff goals: list, get, create, update, delete, archive
  - [ ] Savings goals: list, get, create, update, delete, archive
  - [ ] Goal images: list payoff images, list savings images
- [ ] Tags (3 endpoints)
  - [ ] GET /tags (global)
  - [ ] GET /users/:userId/tags
  - [ ] PUT /users/:userId/tags (bulk operations)
- [ ] POST /users/:userId/accounts (account creation)
- [ ] POST /users/:userId/transactions (manual transaction)

### Phase 2: Important Features (P2)
- [ ] Cashflow Module (15 endpoints)
  - [ ] Database migrations for CashflowBill, CashflowIncome, CashflowEvent
  - [ ] Bills CRUD
  - [ ] Incomes CRUD
  - [ ] Events management
  - [ ] Cashflow summary with projection logic
- [ ] Alerts Module (20 endpoints)
  - [ ] Alert CRUD
  - [ ] 6 alert type create/update endpoints
  - [ ] Alert destinations management
  - [ ] Notification generation (background job)
- [ ] Expenses Module (6 endpoints)
  - [ ] Aggregation logic
  - [ ] Period-based queries
- [ ] Networth Module (2 endpoints)
  - [ ] Calculation logic
  - [ ] Account categorization

### Phase 3: Validation & Testing
- [ ] Unit tests for all serializers
- [ ] Integration tests for all CRUD operations
- [ ] HAR replay tests
- [ ] Field mapping validation
- [ ] Performance testing (<200ms p95)

---

## 16. Conclusion

This integration specification provides complete field mappings between the responsive-tiles frontend and pfm-backend-simulator backend. Key takeaways:

1. **Serialization is Critical**: Every response must match geezeo's RABL format exactly
2. **Data Type Conversions**: BigInt → Number, Decimal → String, Dates → ISO 8601
3. **Snake_case Everywhere**: All JSON keys in snake_case
4. **Resource Wrapping**: Single resources in singular keys, collections in plural keys
5. **Links Object**: Relationships always in separate `links` key
6. **57 Missing Endpoints**: Primarily in Goals, Cashflow, Alerts, and Expenses modules
7. **3 New Models Needed**: CashflowBill, CashflowIncome, CashflowEvent

With this specification, implementers have:
- Exact field requirements for every endpoint
- Serialization templates for all resources
- Validation schemas for all inputs
- Database schema changes needed
- Testing strategy for verification

**Next Steps**: Begin Phase 1 implementation starting with Goals module CRUD operations.
