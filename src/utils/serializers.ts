/**
 * Serialization utilities for API responses
 * Handles snake_case conversion and special type serialization
 */

/**
 * Convert camelCase keys to snake_case recursively
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function snakeCaseKeys(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => snakeCaseKeys(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = snakeCaseKeys(value);
    }
    return result;
  }

  return obj;
}

/**
 * Serialize BigInt and Decimal types to strings for JSON compatibility
 */
export function serializeSpecialTypes(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeSpecialTypes(item));
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'bigint') {
        result[key] = value.toString();
      } else if (value && typeof value === 'object' && 'toNumber' in value) {
        // Handle Prisma Decimal type
        result[key] = (value as any).toNumber();
      } else {
        result[key] = serializeSpecialTypes(value);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Complete serialization pipeline: special types → snake_case
 */
export function serialize(data: any): any {
  const typeSerialized = serializeSpecialTypes(data);
  return snakeCaseKeys(typeSerialized);
}

/**
 * Wrap single object in array for frontend compatibility
 */
export function wrapInArray<T>(data: T | null | undefined, key: string): Record<string, T[]> {
  return { [key]: data ? [data] : [] } as Record<string, T[]>;
}

/**
 * Serialize BigInt to Number (safe for IDs < 2^53)
 */
export function serializeBigInt(value: bigint | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/**
 * Serialize Decimal to String with 2 decimal places
 */
export function serializeDecimal(value: any): string {
  if (value === null || value === undefined) return '0.00';
  if (typeof value === 'object' && 'toFixed' in value) {
    return value.toFixed(2);
  }
  return parseFloat(value).toFixed(2);
}

/**
 * Serialize Date to ISO 8601 string
 */
export function serializeDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Serialize Date to YYYY-MM-DD format
 */
export function serializeDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Extract image name from URL
 */
export function extractImageName(url: string | null | undefined): string | null {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1];
}

/**
 * Serialize Goal to Payoff or Savings format
 */
export function serializeGoal(goal: any, type: 'payoff' | 'savings', calculateProgress: (goal: any) => number, calculateStatus: (goal: any) => string): any {
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
      complete: parseFloat(serializeDecimal(goal.currentAmount)) <= 0,
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
      complete: parseFloat(serializeDecimal(goal.currentAmount)) >= parseFloat(serializeDecimal(goal.targetAmount)),
      created_at: serializeDate(goal.createdAt),
      updated_at: serializeDate(goal.updatedAt),
      links: {
        accounts: goal.accountId ? [serializeBigInt(goal.accountId)] : []
      }
    };
  }
}

// =============================================================================
// TAG SERIALIZATION
// =============================================================================

export function serializeTag(tag: any, transactionCount?: number): any {
  const serialized: any = {
    id: serializeBigInt(tag.id),
    name: tag.name,
    parent_tag_id: tag.parentTagId ? serializeBigInt(tag.parentTagId) : null,
    tag_type: tag.tagType
  };

  // Only include transaction_count if provided
  if (transactionCount !== undefined) {
    serialized.transaction_count = transactionCount;
  }

  return serialized;
}

// =============================================================================
// CASHFLOW SERIALIZATION
// =============================================================================

/**
 * Serialize cashflow bill to API response format
 */
export function serializeBill(bill: any): any {
  return {
    id: serializeBigInt(bill.id),
    name: bill.name,
    amount: bill.amount.toFixed(2),
    due_date: bill.dueDate,
    recurrence: bill.recurrence,
    category_id: bill.categoryId ? serializeBigInt(bill.categoryId) : null,
    account_id: bill.accountId ? serializeBigInt(bill.accountId) : null,
    active: bill.active,
    stopped_at: bill.stoppedAt ? bill.stoppedAt.toISOString() : null,
    created_at: bill.createdAt.toISOString(),
    updated_at: bill.updatedAt.toISOString(),
    links: {
      category: bill.categoryId ? serializeBigInt(bill.categoryId) : null,
      account: bill.accountId ? serializeBigInt(bill.accountId) : null
    }
  };
}

/**
 * Serialize cashflow income to API response format
 */
export function serializeIncome(income: any): any {
  return {
    id: serializeBigInt(income.id),
    name: income.name,
    amount: income.amount.toFixed(2),
    receive_date: income.receiveDate,
    recurrence: income.recurrence,
    category_id: income.categoryId ? serializeBigInt(income.categoryId) : null,
    account_id: income.accountId ? serializeBigInt(income.accountId) : null,
    active: income.active,
    stopped_at: income.stoppedAt ? income.stoppedAt.toISOString() : null,
    created_at: income.createdAt.toISOString(),
    updated_at: income.updatedAt.toISOString(),
    links: {
      category: income.categoryId ? serializeBigInt(income.categoryId) : null,
      account: income.accountId ? serializeBigInt(income.accountId) : null
    }
  };
}

/**
 * Serialize cashflow event to API response format
 */
export function serializeEvent(event: any): any {
  return {
    id: event.id ? serializeBigInt(event.id) : null,
    source_type: event.sourceType,
    source_id: event.sourceId ? serializeBigInt(event.sourceId) : null,
    name: event.name,
    amount: event.amount.toFixed(2),
    event_date: event.eventDate instanceof Date
      ? event.eventDate.toISOString().split('T')[0]
      : event.eventDate,
    event_type: event.eventType,
    account_id: event.accountId ? serializeBigInt(event.accountId) : null,
    processed: event.processed,
    metadata: event.metadata || {}
  };
}

/**
 * Serialize cashflow summary to API response format
 */
export function serializeCashflowSummary(summary: any): any {
  return {
    total_income: summary.totalIncome,
    total_bills: summary.totalBills,
    net_cashflow: summary.netCashflow,
    start_date: summary.startDate,
    end_date: summary.endDate,
    bills_count: summary.billsCount,
    incomes_count: summary.incomesCount,
    events_count: summary.eventsCount,
    average_income: summary.averageIncome,
    average_bills: summary.averageBills,
    settings: {
      auto_categorize: true,
      show_projections: true,
      projection_days: 90
    }
  };
}

// =============================================================================
// ALERT SERIALIZATION
// =============================================================================

/**
 * Serialize alert to API response format with type-specific fields
 */
export function serializeAlert(alert: any): any {
  const conditions = alert.conditions as any;

  const base = {
    id: serializeBigInt(alert.id),
    user_id: serializeBigInt(alert.userId),
    alert_type: alert.alertType.toLowerCase(),
    name: alert.name,
    email_delivery: alert.emailDelivery,
    sms_delivery: alert.smsDelivery,
    active: alert.active,
    last_triggered_at: alert.lastTriggeredAt ? serializeDate(alert.lastTriggeredAt) : null,
    created_at: serializeDate(alert.createdAt),
    updated_at: serializeDate(alert.updatedAt),
    links: {}
  };

  // Add type-specific fields
  switch (alert.alertType) {
    case 'account_threshold':
      return {
        ...base,
        account_id: alert.sourceId ? serializeBigInt(alert.sourceId) : null,
        threshold: conditions.threshold,
        direction: conditions.direction,
        links: {
          account: alert.sourceId ? serializeBigInt(alert.sourceId) : null
        }
      };

    case 'goal':
      return {
        ...base,
        goal_id: alert.sourceId ? serializeBigInt(alert.sourceId) : null,
        milestone_percentage: conditions.milestone_percentage,
        links: {
          goal: alert.sourceId ? serializeBigInt(alert.sourceId) : null
        }
      };

    case 'merchant_name':
      return {
        ...base,
        merchant_pattern: conditions.merchant_pattern,
        match_type: conditions.match_type,
        links: {}
      };

    case 'spending_target':
      return {
        ...base,
        budget_id: alert.sourceId ? serializeBigInt(alert.sourceId) : null,
        threshold_percentage: conditions.threshold_percentage,
        links: {
          budget: alert.sourceId ? serializeBigInt(alert.sourceId) : null
        }
      };

    case 'transaction_limit':
      return {
        ...base,
        account_id: alert.sourceId ? serializeBigInt(alert.sourceId) : null,
        amount: conditions.amount,
        links: {
          ...(alert.sourceId && { account: serializeBigInt(alert.sourceId) })
        }
      };

    case 'upcoming_bill':
      return {
        ...base,
        bill_id: alert.sourceId ? serializeBigInt(alert.sourceId) : null,
        days_before: conditions.days_before,
        links: {
          bill: alert.sourceId ? serializeBigInt(alert.sourceId) : null
        }
      };

    default:
      return base;
  }
}

/**
 * Serialize notification to API response format
 */
export function serializeNotification(notification: any): any {
  const metadata = notification.metadata as any;

  return {
    id: serializeBigInt(notification.id),
    user_id: serializeBigInt(notification.userId),
    alert_id: notification.alertId ? serializeBigInt(notification.alertId) : null,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    read_at: notification.readAt ? serializeDate(notification.readAt) : null,
    email_sent: notification.emailSent,
    email_sent_at: notification.emailSentAt ? serializeDate(notification.emailSentAt) : null,
    sms_sent: notification.smsSent,
    sms_sent_at: notification.smsSentAt ? serializeDate(notification.smsSentAt) : null,
    created_at: serializeDate(notification.createdAt),
    metadata: metadata || {},
    links: {
      alert: notification.alertId ? serializeBigInt(notification.alertId) : null,
      ...(metadata.account_id && { account: serializeBigInt(BigInt(metadata.account_id)) }),
      ...(metadata.goal_id && { goal: serializeBigInt(BigInt(metadata.goal_id)) }),
      ...(metadata.budget_id && { budget: serializeBigInt(BigInt(metadata.budget_id)) }),
      ...(metadata.transaction_id && { transaction: serializeBigInt(BigInt(metadata.transaction_id)) }),
      ...(metadata.bill_id && { bill: serializeBigInt(BigInt(metadata.bill_id)) })
    }
  };
}

// =============================================================================
// EXPENSES SERIALIZATION
// =============================================================================

/**
 * Serialize expenses summary to API response format
 */
export function serializeExpensesSummary(summary: any): any {
  return {
    total: summary.total,
    count: summary.count,
    average: summary.average,
    period: summary.period,
    period_start: summary.startDate,
    period_end: summary.endDate,
    categories: summary.breakdown ? serializeExpensesByCategory(summary.breakdown) : undefined
  };
}

/**
 * Serialize category expenses array
 */
export function serializeExpensesByCategory(categories: any[]): any[] {
  return categories.map(cat => ({
    tag_id: cat.tagId,
    tag_name: cat.tagName || cat.category,
    amount: cat.total,
    transaction_count: cat.count,
    average_amount: cat.average,
    percent_of_total: cat.percentage
  }));
}

/**
 * Serialize merchant expenses array
 */
export function serializeExpensesByMerchant(merchants: any[]): any[] {
  return merchants.map(m => ({
    merchant: m.merchant,
    amount: m.total,
    transaction_count: m.count,
    average_amount: m.average,
    percent_of_total: m.percentage,
    last_transaction_date: m.lastDate
  }));
}

/**
 * Serialize tag expenses with transaction list
 */
export function serializeExpensesByTag(expenses: any): any {
  return {
    tag_id: expenses.tagId,
    tag_name: expenses.tagName,
    total: expenses.total,
    count: expenses.count,
    average: expenses.average,
    transactions: expenses.transactions.map((t: any) => ({
      id: serializeBigInt(t.id),
      account_id: serializeBigInt(t.accountId),
      description: t.description,
      merchant_name: t.merchantName,
      amount: serializeDecimal(t.amount),
      posted_at: serializeDate(t.postedAt),
      primary_tag_id: t.primaryTagId ? serializeBigInt(t.primaryTagId) : null
    }))
  };
}

/**
 * Serialize monthly trends array
 */
export function serializeExpensesTrends(trends: any[]): any[] {
  return trends.map(t => ({
    month: t.month,
    year: t.year,
    total: t.total,
    count: t.count,
    average: t.average
  }));
}

/**
 * Serialize expenses comparison
 */
export function serializeExpensesComparison(comparison: any): any {
  return {
    this_month: {
      total: comparison.thisMonth.total,
      count: comparison.thisMonth.count,
      average: comparison.thisMonth.average
    },
    last_month: {
      total: comparison.lastMonth.total,
      count: comparison.lastMonth.count,
      average: comparison.lastMonth.average
    },
    difference: comparison.difference,
    percentage_change: comparison.percentageChange
  };
}

// =============================================================================
// NETWORTH SERIALIZATION
// =============================================================================

/**
 * Serialize networth summary to API response format
 */
export function serializeNetworth(networth: any): any {
  return {
    assets: networth.assets,
    liabilities: networth.liabilities,
    networth: networth.networth,
    as_of_date: networth.asOfDate
  };
}

/**
 * Serialize account breakdown for networth details
 */
function serializeAccountBreakdown(account: any): any {
  return {
    account_id: account.accountId,
    account_name: account.accountName,
    account_type: account.accountType,
    balance: account.balance,
    contribution: account.contribution
  };
}

/**
 * Serialize detailed networth with account breakdown
 */
export function serializeNetworthDetailed(detailed: any): any {
  return {
    assets: detailed.assets,
    liabilities: detailed.liabilities,
    networth: detailed.networth,
    as_of_date: detailed.asOfDate,
    asset_accounts: detailed.breakdown.assets.map(serializeAccountBreakdown),
    liability_accounts: detailed.breakdown.liabilities.map(serializeAccountBreakdown)
  };
}
