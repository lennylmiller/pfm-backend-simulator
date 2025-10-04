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
