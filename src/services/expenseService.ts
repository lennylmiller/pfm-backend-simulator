/**
 * Expense Service
 * Provides aggregation and analysis of user expenses based on transactions
 */

import { prisma } from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  format,
  startOfDay,
  endOfDay,
} from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

export interface ExpensesSummary {
  total: string;
  count: number;
  average: string;
  period: string;
  startDate: string;
  endDate: string;
  breakdown: CategoryExpense[] | MerchantExpense[] | TagExpense[];
}

export interface CategoryExpense {
  category: string;
  tagId: number | null;
  tagName: string | null;
  total: string;
  count: number;
  average: string;
  percentage: number;
  transactions: number;
}

export interface MerchantExpense {
  merchant: string;
  total: string;
  count: number;
  average: string;
  percentage: number;
  lastDate: string;
}

export interface TagExpense {
  tagId: number | null;
  tagName: string | null;
  total: string;
  count: number;
  average: string;
  percentage: number;
}

export interface TagExpenses {
  tagId: number;
  tagName: string;
  total: string;
  count: number;
  average: string;
  transactions: any[];
}

export interface MonthlyTrend {
  month: string;
  year: number;
  total: string;
  count: number;
  average: string;
}

export interface ExpensesComparison {
  thisMonth: PeriodSummary;
  lastMonth: PeriodSummary;
  difference: string;
  percentageChange: number;
}

export interface PeriodSummary {
  total: string;
  count: number;
  average: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get date range for predefined periods
 */
function getPeriodDates(
  period: string,
  startDate?: Date,
  endDate?: Date
): { startDate: Date; endDate: Date } {
  const now = new Date();

  switch (period) {
    case 'this_month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    case 'last_month':
      return {
        startDate: startOfMonth(subMonths(now, 1)),
        endDate: endOfMonth(subMonths(now, 1)),
      };
    case 'last_thirty_days':
      return {
        startDate: subDays(now, 30),
        endDate: now,
      };
    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('Custom period requires start_date and end_date');
      }
      return {
        startDate: startOfDay(startDate),
        endDate: endOfDay(endDate),
      };
    default:
      throw new Error(
        'Invalid period. Must be: this_month, last_month, last_thirty_days, or custom'
      );
  }
}

/**
 * Calculate percentage of total
 */
function calculatePercentage(amount: Decimal, total: Decimal): number {
  if (total.isZero()) return 0;
  return amount.div(total).mul(100).toNumber();
}

/**
 * Calculate average amount
 */
function calculateAverage(total: Decimal, count: number): string {
  if (count === 0) return '0.00';
  return total.div(count).toFixed(2);
}

/**
 * Calculate percentage change between two periods
 */
function calculatePercentageChange(current: Decimal, previous: Decimal): number {
  if (previous.isZero()) {
    return current.isZero() ? 0 : 100;
  }
  return current.sub(previous).div(previous).mul(100).toNumber();
}

/**
 * Convert Decimal to formatted string
 */
function formatAmount(amount: Decimal | null): string {
  if (!amount) return '0.00';
  return amount.toFixed(2);
}

/**
 * Get absolute value of Decimal (for expense amounts which are negative)
 */
function absDecimal(amount: Decimal): Decimal {
  return amount.isNegative() ? amount.mul(-1) : amount;
}

// =============================================================================
// CORE SERVICE FUNCTIONS
// =============================================================================

/**
 * Get expenses summary for a period with optional grouping and filtering
 */
export async function getExpensesSummary(
  userId: bigint,
  partnerId: bigint,
  options: {
    period: 'this_month' | 'last_month' | 'last_thirty_days' | 'custom';
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'category' | 'merchant' | 'tag';
    includeTagIds?: bigint[];
    excludeTagIds?: bigint[];
  }
): Promise<ExpensesSummary> {
  const { startDate, endDate } = getPeriodDates(options.period, options.startDate, options.endDate);

  // Build transaction filter
  const where: any = {
    userId,
    transactionType: 'debit',
    postedAt: {
      gte: startDate,
      lte: endDate,
    },
    deletedAt: null,
  };

  // Apply tag filtering
  if (options.includeTagIds && options.includeTagIds.length > 0) {
    where.primaryTagId = { in: options.includeTagIds };
  }

  if (options.excludeTagIds && options.excludeTagIds.length > 0) {
    where.primaryTagId = { notIn: options.excludeTagIds };
  }

  // Fetch all expense transactions for the period
  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      id: true,
      amount: true,
      merchantName: true,
      primaryTagId: true,
      postedAt: true,
      description: true,
    },
    orderBy: { postedAt: 'desc' },
  });

  // Calculate total and count
  const total = transactions.reduce(
    (sum, t) => sum.add(absDecimal(new Decimal(t.amount.toString()))),
    new Decimal(0)
  );
  const count = transactions.length;
  const average = calculateAverage(total, count);

  // Generate breakdown based on groupBy option
  let breakdown: CategoryExpense[] | MerchantExpense[] | TagExpense[] = [];

  if (options.groupBy === 'category' || options.groupBy === 'tag') {
    breakdown = await getExpensesByCategory(userId, partnerId, startDate, endDate);
  } else if (options.groupBy === 'merchant') {
    breakdown = await getExpensesByMerchant(userId, partnerId, startDate, endDate);
  } else {
    // Default to category breakdown
    breakdown = await getExpensesByCategory(userId, partnerId, startDate, endDate);
  }

  return {
    total: formatAmount(total),
    count,
    average,
    period: options.period,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    breakdown,
  };
}

/**
 * Get expenses grouped by category with percentages
 */
export async function getExpensesByCategory(
  userId: bigint,
  partnerId: bigint,
  startDate: Date,
  endDate: Date
): Promise<CategoryExpense[]> {
  // Fetch all expense transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionType: 'debit',
      postedAt: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    },
    select: {
      amount: true,
      primaryTagId: true,
    },
  });

  // Calculate total for percentage calculations
  const grandTotal = transactions.reduce(
    (sum, t) => sum.add(absDecimal(new Decimal(t.amount.toString()))),
    new Decimal(0)
  );

  // Group by tag/category
  const grouped = new Map<string, { tagId: bigint | null; transactions: typeof transactions }>();

  for (const transaction of transactions) {
    const key = transaction.primaryTagId?.toString() || 'uncategorized';
    if (!grouped.has(key)) {
      grouped.set(key, {
        tagId: transaction.primaryTagId,
        transactions: [],
      });
    }
    grouped.get(key)!.transactions.push(transaction);
  }

  // Fetch tag names for all unique tag IDs
  const tagIds = Array.from(grouped.values())
    .map((g) => g.tagId)
    .filter((id): id is bigint => id !== null);

  const tags =
    tagIds.length > 0
      ? await prisma.tag.findMany({
          where: { id: { in: tagIds } },
          select: { id: true, name: true },
        })
      : [];

  const tagMap = new Map(tags.map((t) => [t.id.toString(), t.name]));

  // Build category expense array
  const categories: CategoryExpense[] = [];

  for (const [, group] of grouped.entries()) {
    const tagTotal = group.transactions.reduce(
      (sum, t) => sum.add(absDecimal(new Decimal(t.amount.toString()))),
      new Decimal(0)
    );

    categories.push({
      category: group.tagId ? tagMap.get(group.tagId.toString()) || 'Unknown' : 'Uncategorized',
      tagId: group.tagId ? Number(group.tagId) : null,
      tagName: group.tagId ? tagMap.get(group.tagId.toString()) || null : null,
      total: formatAmount(tagTotal),
      count: group.transactions.length,
      average: calculateAverage(tagTotal, group.transactions.length),
      percentage: calculatePercentage(tagTotal, grandTotal),
      transactions: group.transactions.length,
    });
  }

  // Sort by total descending
  categories.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

  return categories;
}

/**
 * Get expenses grouped by merchant
 */
export async function getExpensesByMerchant(
  userId: bigint,
  partnerId: bigint,
  startDate: Date,
  endDate: Date,
  limit?: number
): Promise<MerchantExpense[]> {
  // Fetch all expense transactions with merchants
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionType: 'debit',
      postedAt: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
      merchantName: { not: null },
    },
    select: {
      amount: true,
      merchantName: true,
      postedAt: true,
    },
  });

  // Calculate total for percentages
  const grandTotal = transactions.reduce(
    (sum, t) => sum.add(absDecimal(new Decimal(t.amount.toString()))),
    new Decimal(0)
  );

  // Group by merchant
  const grouped = new Map<string, typeof transactions>();

  for (const transaction of transactions) {
    const merchant = transaction.merchantName || 'Unknown';
    if (!grouped.has(merchant)) {
      grouped.set(merchant, []);
    }
    grouped.get(merchant)!.push(transaction);
  }

  // Build merchant expense array
  const merchants: MerchantExpense[] = [];

  for (const [merchant, txns] of grouped.entries()) {
    const merchantTotal = txns.reduce(
      (sum, t) => sum.add(absDecimal(new Decimal(t.amount.toString()))),
      new Decimal(0)
    );

    // Find most recent transaction date
    const latestDate = txns.reduce(
      (latest, t) => (t.postedAt > latest ? t.postedAt : latest),
      txns[0].postedAt
    );

    merchants.push({
      merchant,
      total: formatAmount(merchantTotal),
      count: txns.length,
      average: calculateAverage(merchantTotal, txns.length),
      percentage: calculatePercentage(merchantTotal, grandTotal),
      lastDate: format(latestDate, 'yyyy-MM-dd'),
    });
  }

  // Sort by total descending
  merchants.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

  // Apply limit if specified
  return limit ? merchants.slice(0, limit) : merchants;
}

/**
 * Get expenses for a specific tag with transaction list
 */
export async function getExpensesByTag(
  userId: bigint,
  partnerId: bigint,
  tagId: bigint,
  startDate: Date,
  endDate: Date
): Promise<TagExpenses> {
  // Fetch tag information
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { id: true, name: true },
  });

  if (!tag) {
    throw new Error('Tag not found');
  }

  // Fetch all expense transactions for this tag
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      primaryTagId: tagId,
      transactionType: 'debit',
      postedAt: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    },
    select: {
      id: true,
      accountId: true,
      description: true,
      merchantName: true,
      amount: true,
      postedAt: true,
      primaryTagId: true,
    },
    orderBy: { postedAt: 'desc' },
  });

  // Calculate totals
  const total = transactions.reduce(
    (sum, t) => sum.add(absDecimal(new Decimal(t.amount.toString()))),
    new Decimal(0)
  );

  return {
    tagId: Number(tagId),
    tagName: tag.name,
    total: formatAmount(total),
    count: transactions.length,
    average: calculateAverage(total, transactions.length),
    transactions,
  };
}

/**
 * Get monthly expense trends over time
 */
export async function getExpensesTrends(
  userId: bigint,
  partnerId: bigint,
  months: number = 6
): Promise<MonthlyTrend[]> {
  const now = new Date();
  const trends: MonthlyTrend[] = [];

  // Generate data for each month
  for (let i = 0; i < months; i++) {
    const monthDate = subMonths(now, i);
    const startDate = startOfMonth(monthDate);
    const endDate = endOfMonth(monthDate);

    // Fetch transactions for this month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionType: 'debit',
        postedAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      select: {
        amount: true,
      },
    });

    // Calculate totals
    const total = transactions.reduce(
      (sum, t) => sum.add(absDecimal(new Decimal(t.amount.toString()))),
      new Decimal(0)
    );

    trends.push({
      month: format(monthDate, 'MMMM'),
      year: monthDate.getFullYear(),
      total: formatAmount(total),
      count: transactions.length,
      average: calculateAverage(total, transactions.length),
    });
  }

  // Reverse to show oldest first
  return trends.reverse();
}

/**
 * Compare current month expenses to previous month
 */
export async function getExpensesComparison(
  userId: bigint,
  _partnerId: bigint
): Promise<ExpensesComparison> {
  const now = new Date();

  // This month
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);

  // Last month
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Fetch this month's transactions
  const thisMonthTxns = await prisma.transaction.findMany({
    where: {
      userId,
      transactionType: 'debit',
      postedAt: {
        gte: thisMonthStart,
        lte: thisMonthEnd,
      },
      deletedAt: null,
    },
    select: { amount: true },
  });

  // Fetch last month's transactions
  const lastMonthTxns = await prisma.transaction.findMany({
    where: {
      userId,
      transactionType: 'debit',
      postedAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
      deletedAt: null,
    },
    select: { amount: true },
  });

  // Calculate totals
  const thisMonthTotal = thisMonthTxns.reduce(
    (sum, t) => sum.add(absDecimal(new Decimal(t.amount.toString()))),
    new Decimal(0)
  );

  const lastMonthTotal = lastMonthTxns.reduce(
    (sum, t) => sum.add(absDecimal(new Decimal(t.amount.toString()))),
    new Decimal(0)
  );

  // Calculate difference and percentage change
  const difference = thisMonthTotal.sub(lastMonthTotal);
  const percentageChange = calculatePercentageChange(thisMonthTotal, lastMonthTotal);

  return {
    thisMonth: {
      total: formatAmount(thisMonthTotal),
      count: thisMonthTxns.length,
      average: calculateAverage(thisMonthTotal, thisMonthTxns.length),
    },
    lastMonth: {
      total: formatAmount(lastMonthTotal),
      count: lastMonthTxns.length,
      average: calculateAverage(lastMonthTotal, lastMonthTxns.length),
    },
    difference: formatAmount(difference),
    percentageChange,
  };
}
