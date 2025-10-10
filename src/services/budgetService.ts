/**
 * Budget Service
 * Business logic for budget operations with Prisma database
 */

import { prisma } from '../config/database';
import { Budget } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CreateBudgetData {
  name: string;
  budget_amount: string;
  month?: number;
  year?: number;
  tag_names?: string[];
  accounts?: string[];
  show_on_dashboard?: boolean;
  start_date?: string;
  end_date?: string;
  recurrence_period?: string;
}

export interface UpdateBudgetData {
  name?: string;
  budget_amount?: string;
  month?: number;
  year?: number;
  tag_names?: string[];
  accounts?: string[];
  show_on_dashboard?: boolean;
  start_date?: string;
  end_date?: string;
  recurrence_period?: string;
}

// =============================================================================
// BUDGET OPERATIONS
// =============================================================================

/**
 * Get all budgets for a user with optional date filtering
 */
export async function getBudgets(
  userId: bigint,
  startDate?: string,
  endDate?: string
): Promise<Budget[]> {
  const where: any = {
    userId,
    deletedAt: null,
  };

  // Date range filtering on budget period
  if (startDate) {
    where.startDate = {
      ...where.startDate,
      gte: new Date(startDate),
    };
  }

  if (endDate) {
    where.endDate = {
      ...where.endDate,
      lte: new Date(endDate),
    };
  }

  const budgets = await prisma.budget.findMany({
    where,
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  // Calculate spent and state for each budget
  const budgetsWithCalculations = await Promise.all(
    budgets.map(async (budget) => {
      const spent = await calculateBudgetSpent(budget);
      const state = calculateBudgetState(budget.budgetAmount, spent);

      // Update if values changed
      if (!budget.spent.equals(spent) || budget.state !== state) {
        return await prisma.budget.update({
          where: { id: budget.id },
          data: { spent, state },
        });
      }

      return budget;
    })
  );

  return budgetsWithCalculations;
}

/**
 * Get a single budget by ID
 */
export async function getBudgetById(
  userId: bigint,
  budgetId: bigint
): Promise<Budget | null> {
  const budget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
      deletedAt: null,
    },
  });

  if (!budget) return null;

  // Calculate spent and state
  const spent = await calculateBudgetSpent(budget);
  const state = calculateBudgetState(budget.budgetAmount, spent);

  // Update if values changed
  if (!budget.spent.equals(spent) || budget.state !== state) {
    return await prisma.budget.update({
      where: { id: budget.id },
      data: { spent, state },
    });
  }

  return budget;
}

/**
 * Create a new budget
 */
export async function createBudget(
  userId: bigint,
  data: CreateBudgetData
): Promise<Budget> {
  const accountList = data.accounts?.map((id) => BigInt(id)) || [];

  return await prisma.budget.create({
    data: {
      userId,
      name: data.name,
      budgetAmount: new Decimal(data.budget_amount),
      month: data.month || new Date().getMonth() + 1,
      year: data.year || new Date().getFullYear(),
      tagNames: data.tag_names || [],
      accountList,
      showOnDashboard: data.show_on_dashboard ?? true,
      startDate: data.start_date ? new Date(data.start_date) : null,
      endDate: data.end_date ? new Date(data.end_date) : null,
      recurrencePeriod: data.recurrence_period || null,
      spent: new Decimal(0),
      state: 'under',
      other: {},
    },
  });
}

/**
 * Update an existing budget
 */
export async function updateBudget(
  userId: bigint,
  budgetId: bigint,
  data: UpdateBudgetData
): Promise<Budget | null> {
  // Verify ownership
  const existing = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) return null;

  const accountList = data.accounts?.map((id) => BigInt(id));

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.budget_amount !== undefined) updateData.budgetAmount = new Decimal(data.budget_amount);
  if (data.month !== undefined) updateData.month = data.month;
  if (data.year !== undefined) updateData.year = data.year;
  if (data.tag_names !== undefined) updateData.tagNames = data.tag_names;
  if (accountList !== undefined) updateData.accountList = accountList;
  if (data.show_on_dashboard !== undefined) updateData.showOnDashboard = data.show_on_dashboard;
  if (data.start_date !== undefined) updateData.startDate = data.start_date ? new Date(data.start_date) : null;
  if (data.end_date !== undefined) updateData.endDate = data.end_date ? new Date(data.end_date) : null;
  if (data.recurrence_period !== undefined) updateData.recurrencePeriod = data.recurrence_period;

  const updated = await prisma.budget.update({
    where: { id: budgetId },
    data: updateData,
  });

  // Recalculate spent and state
  const spent = await calculateBudgetSpent(updated);
  const state = calculateBudgetState(updated.budgetAmount, spent);

  return await prisma.budget.update({
    where: { id: budgetId },
    data: { spent, state },
  });
}

/**
 * Delete a budget (soft delete)
 */
export async function deleteBudget(
  userId: bigint,
  budgetId: bigint
): Promise<boolean> {
  const result = await prisma.budget.updateMany({
    where: {
      id: budgetId,
      userId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return result.count > 0;
}

// =============================================================================
// CALCULATION HELPERS
// =============================================================================

/**
 * Calculate total spent for a budget based on transactions
 */
async function calculateBudgetSpent(budget: Budget): Promise<Decimal> {
  const where: any = {
    userId: budget.userId,
    deletedAt: null,
    transactionType: 'debit',
  };

  // Filter by accounts if specified
  if (budget.accountList.length > 0) {
    where.accountId = {
      in: budget.accountList,
    };
  }

  // Filter by date range
  if (budget.startDate || budget.endDate) {
    where.postedAt = {};
    if (budget.startDate) {
      where.postedAt.gte = budget.startDate;
    }
    if (budget.endDate) {
      where.postedAt.lte = budget.endDate;
    }
  } else if (budget.month && budget.year) {
    // Use month/year for date range
    const startOfMonth = new Date(budget.year, budget.month - 1, 1);
    const endOfMonth = new Date(budget.year, budget.month, 0, 23, 59, 59, 999);
    where.postedAt = {
      gte: startOfMonth,
      lte: endOfMonth,
    };
  }

  // Filter by tags if specified
  if (budget.tagNames.length > 0) {
    // Get tag IDs for the tag names
    const tags = await prisma.tag.findMany({
      where: {
        name: { in: budget.tagNames },
        OR: [
          { userId: budget.userId },
          { partnerId: null }, // System tags
        ],
      },
    });

    if (tags.length > 0) {
      where.primaryTagId = {
        in: tags.map((t) => t.id),
      };
    }
  }

  const result = await prisma.transaction.aggregate({
    where,
    _sum: {
      amount: true,
    },
  });

  // Return absolute value since debits are negative
  const total = result._sum.amount || new Decimal(0);
  return total.abs();
}

/**
 * Calculate budget state based on spent vs budget amount
 */
function calculateBudgetState(budgetAmount: Decimal, spent: Decimal): string {
  const percentage = spent.div(budgetAmount).mul(100);

  if (percentage.gte(100)) {
    return 'over';
  } else if (percentage.gte(90)) {
    return 'risk';
  } else {
    return 'under';
  }
}
