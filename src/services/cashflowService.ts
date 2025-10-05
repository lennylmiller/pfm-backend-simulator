/**
 * Cashflow Service
 * Business logic for cashflow bills, incomes, and event projections
 * Optimized for <200ms response time
 */

import { prisma } from '../config/database';
import { CashflowBill, CashflowIncome, CashflowEvent } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CreateBillData {
  name: string;
  amount: string;
  dueDate: number;
  recurrence: string;
  categoryId?: bigint;
  accountId?: bigint;
}

export interface UpdateBillData {
  name?: string;
  amount?: string;
  dueDate?: number;
  recurrence?: string;
  categoryId?: bigint | null;
  accountId?: bigint | null;
}

export interface CreateIncomeData {
  name: string;
  amount: string;
  receiveDate: number;
  recurrence: string;
  categoryId?: bigint;
  accountId?: bigint;
}

export interface UpdateIncomeData {
  name?: string;
  amount?: string;
  receiveDate?: number;
  recurrence?: string;
  categoryId?: bigint | null;
  accountId?: bigint | null;
}

export interface CashflowSummary {
  totalIncome: string;
  totalBills: string;
  netCashflow: string;
  startDate: string;
  endDate: string;
  billsCount: number;
  incomesCount: number;
  eventsCount: number;
  averageIncome: string;
  averageBills: string;
}

export interface CashflowEventData {
  id?: bigint;
  userId: bigint;
  sourceType: string;
  sourceId?: bigint | null;
  name: string;
  amount: Decimal;
  eventDate: Date;
  eventType: string;
  accountId?: bigint | null;
  processed: boolean;
  metadata: Record<string, any>;
}

// =============================================================================
// BILL OPERATIONS
// =============================================================================

/**
 * Get all active bills for a user
 */
export async function getAllBills(userId: bigint): Promise<CashflowBill[]> {
  return await prisma.cashflowBill.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: [{ active: 'desc' }, { dueDate: 'asc' }],
  });
}

/**
 * Get a single bill by ID
 */
export async function getBillById(userId: bigint, billId: bigint): Promise<CashflowBill | null> {
  return await prisma.cashflowBill.findFirst({
    where: {
      id: billId,
      userId,
      deletedAt: null,
    },
  });
}

/**
 * Create a new bill
 */
export async function createBill(userId: bigint, data: CreateBillData): Promise<CashflowBill> {
  return await prisma.cashflowBill.create({
    data: {
      userId,
      name: data.name,
      amount: new Decimal(data.amount),
      dueDate: data.dueDate,
      recurrence: data.recurrence,
      categoryId: data.categoryId || null,
      accountId: data.accountId || null,
      active: true,
    },
  });
}

/**
 * Update a bill
 */
export async function updateBill(
  userId: bigint,
  billId: bigint,
  data: UpdateBillData
): Promise<CashflowBill | null> {
  // Verify ownership
  const existing = await prisma.cashflowBill.findFirst({
    where: {
      id: billId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.cashflowBill.update({
    where: { id: billId },
    data: {
      name: data.name,
      amount: data.amount ? new Decimal(data.amount) : undefined,
      dueDate: data.dueDate,
      recurrence: data.recurrence,
      categoryId: data.categoryId,
      accountId: data.accountId,
      updatedAt: new Date(),
    },
  });
}

/**
 * Soft delete a bill
 */
export async function deleteBill(userId: bigint, billId: bigint): Promise<boolean> {
  const existing = await prisma.cashflowBill.findFirst({
    where: {
      id: billId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.cashflowBill.update({
    where: { id: billId },
    data: { deletedAt: new Date() },
  });

  return true;
}

/**
 * Stop a bill (deactivate)
 */
export async function stopBill(userId: bigint, billId: bigint): Promise<CashflowBill | null> {
  const existing = await prisma.cashflowBill.findFirst({
    where: {
      id: billId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.cashflowBill.update({
    where: { id: billId },
    data: {
      active: false,
      stoppedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

// =============================================================================
// INCOME OPERATIONS
// =============================================================================

/**
 * Get all active incomes for a user
 */
export async function getAllIncomes(userId: bigint): Promise<CashflowIncome[]> {
  return await prisma.cashflowIncome.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: [{ active: 'desc' }, { receiveDate: 'asc' }],
  });
}

/**
 * Get a single income by ID
 */
export async function getIncomeById(
  userId: bigint,
  incomeId: bigint
): Promise<CashflowIncome | null> {
  return await prisma.cashflowIncome.findFirst({
    where: {
      id: incomeId,
      userId,
      deletedAt: null,
    },
  });
}

/**
 * Create a new income
 */
export async function createIncome(
  userId: bigint,
  data: CreateIncomeData
): Promise<CashflowIncome> {
  return await prisma.cashflowIncome.create({
    data: {
      userId,
      name: data.name,
      amount: new Decimal(data.amount),
      receiveDate: data.receiveDate,
      recurrence: data.recurrence,
      categoryId: data.categoryId || null,
      accountId: data.accountId || null,
      active: true,
    },
  });
}

/**
 * Update an income
 */
export async function updateIncome(
  userId: bigint,
  incomeId: bigint,
  data: UpdateIncomeData
): Promise<CashflowIncome | null> {
  // Verify ownership
  const existing = await prisma.cashflowIncome.findFirst({
    where: {
      id: incomeId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.cashflowIncome.update({
    where: { id: incomeId },
    data: {
      name: data.name,
      amount: data.amount ? new Decimal(data.amount) : undefined,
      receiveDate: data.receiveDate,
      recurrence: data.recurrence,
      categoryId: data.categoryId,
      accountId: data.accountId,
      updatedAt: new Date(),
    },
  });
}

/**
 * Soft delete an income
 */
export async function deleteIncome(userId: bigint, incomeId: bigint): Promise<boolean> {
  const existing = await prisma.cashflowIncome.findFirst({
    where: {
      id: incomeId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.cashflowIncome.update({
    where: { id: incomeId },
    data: { deletedAt: new Date() },
  });

  return true;
}

/**
 * Stop an income (deactivate)
 */
export async function stopIncome(userId: bigint, incomeId: bigint): Promise<CashflowIncome | null> {
  const existing = await prisma.cashflowIncome.findFirst({
    where: {
      id: incomeId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.cashflowIncome.update({
    where: { id: incomeId },
    data: {
      active: false,
      stoppedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

// =============================================================================
// EVENT PROJECTION LOGIC
// =============================================================================

/**
 * Project recurring item to events
 * Handles monthly, biweekly, and weekly recurrence patterns
 */
export function projectRecurringItem(
  item: CashflowBill | CashflowIncome,
  sourceType: string,
  eventType: string,
  startDate: Date,
  endDate: Date
): CashflowEventData[] {
  const events: CashflowEventData[] = [];
  const dueDate = 'dueDate' in item ? item.dueDate : item.receiveDate;
  const recurrence = item.recurrence;

  // Start from the beginning of the current month
  const current = new Date(startDate);
  current.setDate(dueDate);

  // If the due date has already passed this month, start from next occurrence
  if (current < startDate) {
    if (recurrence === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else if (recurrence === 'biweekly') {
      current.setDate(current.getDate() + 14);
    } else if (recurrence === 'weekly') {
      current.setDate(current.getDate() + 7);
    }
  }

  // Generate events until end date
  while (current <= endDate) {
    if (current >= startDate) {
      events.push({
        userId: item.userId,
        sourceType,
        sourceId: item.id,
        name: item.name,
        amount: eventType === 'expense' ? item.amount.neg() : item.amount,
        eventDate: new Date(current),
        eventType,
        accountId: item.accountId || null,
        processed: false,
        metadata: {
          recurrence,
          originalDueDate: dueDate,
        },
      });
    }

    // Advance to next occurrence
    if (recurrence === 'monthly') {
      current.setMonth(current.getMonth() + 1);
      // Handle month-end dates (e.g., Jan 31 -> Feb 28)
      if (current.getDate() !== dueDate) {
        current.setDate(0); // Last day of previous month
        current.setMonth(current.getMonth() + 1);
        current.setDate(Math.min(dueDate, current.getDate()));
      }
    } else if (recurrence === 'biweekly') {
      current.setDate(current.getDate() + 14);
    } else if (recurrence === 'weekly') {
      current.setDate(current.getDate() + 7);
    }
  }

  return events;
}

/**
 * Generate cashflow events for next 90 days
 * Performance optimized: parallel queries, single batch processing
 */
export async function generateCashflowEvents(userId: bigint): Promise<CashflowEventData[]> {
  const startDate = new Date();
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  // Fetch bills and incomes in parallel for performance
  const [bills, incomes] = await Promise.all([
    prisma.cashflowBill.findMany({
      where: { userId, active: true, deletedAt: null },
    }),
    prisma.cashflowIncome.findMany({
      where: { userId, active: true, deletedAt: null },
    }),
  ]);

  const events: CashflowEventData[] = [];

  // Project all bills
  for (const bill of bills) {
    const billEvents = projectRecurringItem(bill, 'bill', 'expense', startDate, endDate);
    events.push(...billEvents);
  }

  // Project all incomes
  for (const income of incomes) {
    const incomeEvents = projectRecurringItem(income, 'income', 'income', startDate, endDate);
    events.push(...incomeEvents);
  }

  // Sort by date for consistent ordering
  events.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  return events;
}

/**
 * Get cashflow events with optional persistence
 * For performance: generates on-the-fly unless persistence is needed
 */
export async function getCashflowEvents(
  userId: bigint,
  persist: boolean = false
): Promise<CashflowEvent[]> {
  // Generate projected events
  const projectedEvents = await generateCashflowEvents(userId);

  // Optionally persist for caching
  if (persist) {
    // Delete old projections
    await prisma.cashflowEvent.deleteMany({
      where: {
        userId,
        processed: false,
        sourceType: { in: ['bill', 'income'] },
      },
    });

    // Create new projections in batch
    return await prisma.cashflowEvent
      .createMany({
        data: projectedEvents,
      })
      .then(() =>
        prisma.cashflowEvent.findMany({
          where: {
            userId,
            deletedAt: null,
          },
          orderBy: { eventDate: 'asc' },
        })
      );
  }

  // Return as non-persisted data (cast for type compatibility)
  return projectedEvents as unknown as CashflowEvent[];
}

/**
 * Update a cashflow event
 */
export async function updateCashflowEvent(
  userId: bigint,
  eventId: bigint,
  data: Partial<CashflowEventData>
): Promise<CashflowEvent | null> {
  const existing = await prisma.cashflowEvent.findFirst({
    where: {
      id: eventId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.cashflowEvent.update({
    where: { id: eventId },
    data: {
      name: data.name,
      amount: data.amount,
      eventDate: data.eventDate,
      accountId: data.accountId,
      processed: data.processed,
      metadata: data.metadata,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a cashflow event
 */
export async function deleteCashflowEvent(userId: bigint, eventId: bigint): Promise<boolean> {
  const existing = await prisma.cashflowEvent.findFirst({
    where: {
      id: eventId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.cashflowEvent.update({
    where: { id: eventId },
    data: { deletedAt: new Date() },
  });

  return true;
}

// =============================================================================
// CASHFLOW SUMMARY CALCULATIONS
// =============================================================================

/**
 * Calculate cashflow summary with averages
 * Performance optimized: single query for counts, batch calculations
 */
export async function getCashflowSummary(userId: bigint): Promise<CashflowSummary> {
  const startDate = new Date();
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  // Parallel queries for optimal performance
  const [bills, incomes, billsCount, incomesCount] = await Promise.all([
    prisma.cashflowBill.findMany({
      where: { userId, active: true, deletedAt: null },
      select: { amount: true },
    }),
    prisma.cashflowIncome.findMany({
      where: { userId, active: true, deletedAt: null },
      select: { amount: true },
    }),
    prisma.cashflowBill.count({
      where: { userId, active: true, deletedAt: null },
    }),
    prisma.cashflowIncome.count({
      where: { userId, active: true, deletedAt: null },
    }),
  ]);

  // Calculate totals
  const totalBills = bills.reduce((sum, bill) => sum.add(bill.amount), new Decimal(0));

  const totalIncome = incomes.reduce((sum, income) => sum.add(income.amount), new Decimal(0));

  const netCashflow = totalIncome.minus(totalBills);

  // Calculate averages
  const averageBills = billsCount > 0 ? totalBills.div(billsCount) : new Decimal(0);

  const averageIncome = incomesCount > 0 ? totalIncome.div(incomesCount) : new Decimal(0);

  // Get projected events count efficiently
  const events = await generateCashflowEvents(userId);

  return {
    totalIncome: totalIncome.toFixed(2),
    totalBills: totalBills.toFixed(2),
    netCashflow: netCashflow.toFixed(2),
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    billsCount,
    incomesCount,
    eventsCount: events.length,
    averageIncome: averageIncome.toFixed(2),
    averageBills: averageBills.toFixed(2),
  };
}
