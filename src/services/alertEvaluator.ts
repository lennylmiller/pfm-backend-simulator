/**
 * Alert Evaluator
 * Logic for evaluating alert conditions and creating notifications
 * Designed to be called by background jobs or real-time triggers
 */

import { PrismaClient, Alert, Account, Goal, Budget, CashflowBill, Transaction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { createNotification } from './alertService';

const prisma = new PrismaClient();

// =============================================================================
// EVALUATOR INTERFACE
// =============================================================================

export interface AlertEvaluator {
  /**
   * Evaluate if alert conditions are met
   * @param alert The alert to evaluate
   * @param context Additional data needed for evaluation
   * @returns true if alert should trigger, false otherwise
   */
  evaluateAlert(alert: Alert, context: any): Promise<boolean>;

  /**
   * Create a notification for the triggered alert
   * @param alert The alert that triggered
   * @param data Context data for the notification
   */
  createNotification(alert: Alert, data: any): Promise<void>;
}

// =============================================================================
// ACCOUNT THRESHOLD EVALUATOR
// =============================================================================

export class AccountThresholdEvaluator implements AlertEvaluator {
  async evaluateAlert(alert: Alert, account: Account): Promise<boolean> {
    const conditions = alert.conditions as any;
    const threshold = new Decimal(conditions.threshold);
    const direction = conditions.direction;

    if (direction === 'below') {
      return account.balance.lessThan(threshold);
    } else if (direction === 'above') {
      return account.balance.greaterThan(threshold);
    }

    return false;
  }

  async createNotification(alert: Alert, data: { account: Account }): Promise<void> {
    const conditions = alert.conditions as any;
    const direction = conditions.direction;

    await createNotification(alert.userId, {
      alertId: alert.id,
      title: alert.name,
      message: `Your ${data.account.name} balance is ${direction} $${conditions.threshold}. Current balance: $${data.account.balance.toFixed(2)}`,
      metadata: {
        account_id: data.account.id.toString(),
        current_balance: data.account.balance.toFixed(2),
        threshold: conditions.threshold,
        direction
      }
    });
  }
}

// =============================================================================
// GOAL EVALUATOR
// =============================================================================

export class GoalEvaluator implements AlertEvaluator {
  async evaluateAlert(alert: Alert, goal: Goal): Promise<boolean> {
    const conditions = alert.conditions as any;
    const milestone = conditions.milestone_percentage;

    // Calculate current progress
    let progress = 0;
    const metadata = goal.metadata as any;

    if (goal.goalType === 'payoff') {
      const initialValue = metadata.initialValue
        ? new Decimal(metadata.initialValue)
        : goal.currentAmount;

      if (initialValue.greaterThan(0)) {
        const paid = initialValue.minus(goal.currentAmount);
        progress = paid.dividedBy(initialValue).times(100).toNumber();
      }
    } else {
      // savings
      if (goal.targetAmount.greaterThan(0)) {
        progress = goal.currentAmount.dividedBy(goal.targetAmount).times(100).toNumber();
      }
    }

    // Alert if we've reached or passed the milestone
    return progress >= milestone;
  }

  async createNotification(alert: Alert, data: { goal: Goal; progress: number }): Promise<void> {
    const conditions = alert.conditions as any;

    await createNotification(alert.userId, {
      alertId: alert.id,
      title: alert.name,
      message: `Your goal "${data.goal.name}" has reached ${data.progress.toFixed(1)}% completion!`,
      metadata: {
        goal_id: data.goal.id.toString(),
        goal_type: data.goal.goalType,
        progress: data.progress,
        milestone: conditions.milestone_percentage
      }
    });
  }
}

// =============================================================================
// MERCHANT NAME EVALUATOR
// =============================================================================

export class MerchantNameEvaluator implements AlertEvaluator {
  async evaluateAlert(alert: Alert, transaction: Transaction): Promise<boolean> {
    const conditions = alert.conditions as any;
    const pattern = conditions.merchant_pattern.toLowerCase();
    const matchType = conditions.match_type;

    if (!transaction.merchantName) {
      return false;
    }

    const merchantName = transaction.merchantName.toLowerCase();

    if (matchType === 'exact') {
      return merchantName === pattern;
    } else {
      return merchantName.includes(pattern);
    }
  }

  async createNotification(alert: Alert, data: { transaction: Transaction }): Promise<void> {
    const conditions = alert.conditions as any;

    await createNotification(alert.userId, {
      alertId: alert.id,
      title: alert.name,
      message: `Transaction detected: ${data.transaction.merchantName} for $${data.transaction.amount.abs().toFixed(2)}`,
      metadata: {
        transaction_id: data.transaction.id.toString(),
        merchant_name: data.transaction.merchantName,
        amount: data.transaction.amount.abs().toFixed(2),
        pattern: conditions.merchant_pattern
      }
    });
  }
}

// =============================================================================
// SPENDING TARGET EVALUATOR
// =============================================================================

export class SpendingTargetEvaluator implements AlertEvaluator {
  async evaluateAlert(alert: Alert, data: { budget: Budget; spent: Decimal }): Promise<boolean> {
    const conditions = alert.conditions as any;
    const thresholdPercentage = conditions.threshold_percentage;

    const percentUsed = data.spent.dividedBy(data.budget.budgetAmount).times(100).toNumber();

    return percentUsed >= thresholdPercentage;
  }

  async createNotification(alert: Alert, data: { budget: Budget; spent: Decimal; percentUsed: number }): Promise<void> {
    const conditions = alert.conditions as any;

    await createNotification(alert.userId, {
      alertId: alert.id,
      title: alert.name,
      message: `Your "${data.budget.name}" budget is at ${data.percentUsed.toFixed(1)}% ($${data.spent.toFixed(2)} of $${data.budget.budgetAmount.toFixed(2)})`,
      metadata: {
        budget_id: data.budget.id.toString(),
        spent: data.spent.toFixed(2),
        budget_amount: data.budget.budgetAmount.toFixed(2),
        percent_used: data.percentUsed,
        threshold: conditions.threshold_percentage
      }
    });
  }
}

// =============================================================================
// TRANSACTION LIMIT EVALUATOR
// =============================================================================

export class TransactionLimitEvaluator implements AlertEvaluator {
  async evaluateAlert(alert: Alert, transaction: Transaction): Promise<boolean> {
    const conditions = alert.conditions as any;
    const limit = new Decimal(conditions.amount);

    // Check if transaction amount exceeds limit
    return transaction.amount.abs().greaterThan(limit);
  }

  async createNotification(alert: Alert, data: { transaction: Transaction }): Promise<void> {
    const conditions = alert.conditions as any;

    await createNotification(alert.userId, {
      alertId: alert.id,
      title: alert.name,
      message: `Large transaction detected: ${data.transaction.description || 'Transaction'} for $${data.transaction.amount.abs().toFixed(2)} exceeds your limit of $${conditions.amount}`,
      metadata: {
        transaction_id: data.transaction.id.toString(),
        amount: data.transaction.amount.abs().toFixed(2),
        limit: conditions.amount,
        description: data.transaction.description
      }
    });
  }
}

// =============================================================================
// UPCOMING BILL EVALUATOR
// =============================================================================

export class UpcomingBillEvaluator implements AlertEvaluator {
  async evaluateAlert(alert: Alert, data: { bill: CashflowBill; daysUntilDue: number }): Promise<boolean> {
    const conditions = alert.conditions as any;
    const daysBefore = conditions.days_before;

    // Alert if we're within the specified days before due date
    return data.daysUntilDue <= daysBefore && data.daysUntilDue >= 0;
  }

  async createNotification(alert: Alert, data: { bill: CashflowBill; daysUntilDue: number; dueDate: Date }): Promise<void> {
    const conditions = alert.conditions as any;

    const daysText = data.daysUntilDue === 0 ? 'today' :
                     data.daysUntilDue === 1 ? 'tomorrow' :
                     `in ${data.daysUntilDue} days`;

    await createNotification(alert.userId, {
      alertId: alert.id,
      title: alert.name,
      message: `Bill "${data.bill.name}" for $${data.bill.amount.toFixed(2)} is due ${daysText}`,
      metadata: {
        bill_id: data.bill.id.toString(),
        amount: data.bill.amount.toFixed(2),
        due_date: data.dueDate.toISOString().split('T')[0],
        days_until_due: data.daysUntilDue,
        days_before_alert: conditions.days_before
      }
    });
  }
}

// =============================================================================
// EVALUATOR FACTORY
// =============================================================================

export function getEvaluatorForAlertType(alertType: string): AlertEvaluator {
  switch (alertType) {
    case 'account_threshold':
      return new AccountThresholdEvaluator();
    case 'goal':
      return new GoalEvaluator();
    case 'merchant_name':
      return new MerchantNameEvaluator();
    case 'spending_target':
      return new SpendingTargetEvaluator();
    case 'transaction_limit':
      return new TransactionLimitEvaluator();
    case 'upcoming_bill':
      return new UpcomingBillEvaluator();
    default:
      throw new Error(`Unknown alert type: ${alertType}`);
  }
}

// =============================================================================
// EVALUATION HELPERS
// =============================================================================

/**
 * Evaluate all active alerts for a user
 * This would typically be called by a background job
 */
export async function evaluateAllUserAlerts(userId: bigint): Promise<void> {
  const alerts = await prisma.alert.findMany({
    where: {
      userId,
      active: true,
      deletedAt: null
    }
  });

  for (const alert of alerts) {
    await evaluateAlert(alert);
  }
}

/**
 * Evaluate a single alert
 */
export async function evaluateAlert(alert: Alert): Promise<void> {
  const evaluator = getEvaluatorForAlertType(alert.alertType);
  const conditions = alert.conditions as any;

  try {
    switch (alert.alertType) {
      case 'account_threshold': {
        const accountId = BigInt(conditions.account_id);
        const account = await prisma.account.findUnique({
          where: { id: accountId }
        });

        if (account && await evaluator.evaluateAlert(alert, account)) {
          await evaluator.createNotification(alert, { account });
          await updateAlertLastTriggered(alert.id);
        }
        break;
      }

      case 'goal': {
        const goalId = BigInt(conditions.goal_id);
        const goal = await prisma.goal.findUnique({
          where: { id: goalId }
        });

        if (goal && await evaluator.evaluateAlert(alert, goal)) {
          // Calculate progress for notification
          let progress = 0;
          const metadata = goal.metadata as any;

          if (goal.goalType === 'payoff') {
            const initialValue = metadata.initialValue
              ? new Decimal(metadata.initialValue)
              : goal.currentAmount;

            if (initialValue.greaterThan(0)) {
              const paid = initialValue.minus(goal.currentAmount);
              progress = paid.dividedBy(initialValue).times(100).toNumber();
            }
          } else {
            if (goal.targetAmount.greaterThan(0)) {
              progress = goal.currentAmount.dividedBy(goal.targetAmount).times(100).toNumber();
            }
          }

          await evaluator.createNotification(alert, { goal, progress });
          await updateAlertLastTriggered(alert.id);
        }
        break;
      }

      case 'spending_target': {
        const budgetId = BigInt(conditions.budget_id);
        const budget = await prisma.budget.findUnique({
          where: { id: budgetId }
        });

        if (budget) {
          // Calculate spent amount
          const spent = await calculateBudgetSpent(budget);
          const percentUsed = spent.dividedBy(budget.budgetAmount).times(100).toNumber();

          if (await evaluator.evaluateAlert(alert, { budget, spent })) {
            await evaluator.createNotification(alert, { budget, spent, percentUsed });
            await updateAlertLastTriggered(alert.id);
          }
        }
        break;
      }

      // Note: merchant_name, transaction_limit, and upcoming_bill are evaluated in real-time
      // when those events occur (new transaction, bill due date approaching, etc.)
    }
  } catch (error) {
    console.error(`Error evaluating alert ${alert.id}:`, error);
  }
}

/**
 * Update alert last triggered timestamp
 */
async function updateAlertLastTriggered(alertId: bigint): Promise<void> {
  await prisma.alert.update({
    where: { id: alertId },
    data: { lastTriggeredAt: new Date() }
  });
}

/**
 * Calculate budget spent amount
 */
async function calculateBudgetSpent(budget: Budget): Promise<Decimal> {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: budget.userId,
      accountId: budget.accountList.length > 0 ? { in: budget.accountList } : undefined,
      postedAt: { gte: firstDay, lte: lastDay },
      deletedAt: null,
      amount: { lt: 0 }
    }
  });

  // Filter by tag names if budget has tags
  let matchingTxs = transactions;
  if (budget.tagNames.length > 0) {
    // This would require joining with tags table
    // For now, just sum all transactions
  }

  return matchingTxs.reduce((sum, tx) => sum.plus(tx.amount.abs()), new Decimal(0));
}
