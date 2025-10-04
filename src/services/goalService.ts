/**
 * Goal Service
 * Business logic for savings and payoff goals
 */

import { prisma } from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import { Goal, GoalType } from '@prisma/client';

// =============================================================================
// INTERFACES
// =============================================================================

export interface GetGoalsOptions {
  includeArchived?: boolean;
}

export interface CreatePayoffGoalData {
  name: string;
  currentValue: string;
  accountId: bigint;
  targetCompletionOn?: string;
  monthlyContribution?: string;
  imageUrl?: string;
}

export interface UpdatePayoffGoalData {
  name?: string;
  currentValue?: string;
  accountId?: bigint;
  targetCompletionOn?: string;
  monthlyContribution?: string;
  imageUrl?: string;
}

export interface CreateSavingsGoalData {
  name: string;
  targetValue: string;
  currentValue?: string;
  accountId?: bigint;
  targetCompletionOn?: string;
  monthlyContribution?: string;
  imageUrl?: string;
}

export interface UpdateSavingsGoalData {
  name?: string;
  targetValue?: string;
  currentValue?: string;
  accountId?: bigint;
  targetCompletionOn?: string;
  monthlyContribution?: string;
  imageUrl?: string;
}

// =============================================================================
// PAYOFF GOALS
// =============================================================================

export async function getPayoffGoals(
  userId: bigint,
  options: GetGoalsOptions = {}
): Promise<Goal[]> {
  const { includeArchived = false } = options;

  const where: any = {
    userId,
    goalType: 'payoff' as GoalType,
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

export async function getPayoffGoalById(
  userId: bigint,
  goalId: bigint
): Promise<Goal | null> {
  return await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
      goalType: 'payoff' as GoalType,
      deletedAt: null
    }
  });
}

export async function createPayoffGoal(
  userId: bigint,
  data: CreatePayoffGoalData
): Promise<Goal> {
  // Validate account ownership
  const account = await prisma.account.findFirst({
    where: {
      id: data.accountId,
      userId,
      archivedAt: null
    }
  });

  if (!account) {
    throw new Error('Account not found or does not belong to user');
  }

  const currentValue = new Decimal(data.currentValue);

  return await prisma.goal.create({
    data: {
      userId,
      goalType: 'payoff' as GoalType,
      name: data.name,
      targetAmount: new Decimal(0), // Payoff goals always target 0
      currentAmount: currentValue,
      accountId: data.accountId,
      targetDate: data.targetCompletionOn ? new Date(data.targetCompletionOn) : null,
      imageUrl: data.imageUrl || null,
      metadata: {
        initialValue: data.currentValue,
        monthlyContribution: data.monthlyContribution || '0.00'
      }
    }
  });
}

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
      goalType: 'payoff' as GoalType,
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
        archivedAt: null
      }
    });

    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }
  }

  // Build update data
  const updateData: any = {};
  const metadata = existing.metadata as any;

  if (data.name !== undefined) updateData.name = data.name;
  if (data.currentValue !== undefined) updateData.currentAmount = new Decimal(data.currentValue);
  if (data.accountId !== undefined) updateData.accountId = data.accountId;
  if (data.targetCompletionOn !== undefined) {
    updateData.targetDate = data.targetCompletionOn ? new Date(data.targetCompletionOn) : null;
  }
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

  if (data.monthlyContribution !== undefined) {
    updateData.metadata = {
      ...metadata,
      monthlyContribution: data.monthlyContribution
    };
  }

  return await prisma.goal.update({
    where: { id: goalId },
    data: updateData
  });
}

export async function deletePayoffGoal(
  userId: bigint,
  goalId: bigint
): Promise<boolean> {
  const result = await prisma.goal.updateMany({
    where: {
      id: goalId,
      userId,
      goalType: 'payoff' as GoalType,
      deletedAt: null
    },
    data: {
      deletedAt: new Date()
    }
  });

  return result.count > 0;
}

export async function archivePayoffGoal(
  userId: bigint,
  goalId: bigint
): Promise<boolean> {
  const result = await prisma.goal.updateMany({
    where: {
      id: goalId,
      userId,
      goalType: 'payoff' as GoalType,
      deletedAt: null
    },
    data: {
      archivedAt: new Date()
    }
  });

  return result.count > 0;
}

// =============================================================================
// SAVINGS GOALS
// =============================================================================

export async function getSavingsGoals(
  userId: bigint,
  options: GetGoalsOptions = {}
): Promise<Goal[]> {
  const { includeArchived = false } = options;

  const where: any = {
    userId,
    goalType: 'savings' as GoalType,
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

export async function getSavingsGoalById(
  userId: bigint,
  goalId: bigint
): Promise<Goal | null> {
  return await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
      goalType: 'savings' as GoalType,
      deletedAt: null
    }
  });
}

export async function createSavingsGoal(
  userId: bigint,
  data: CreateSavingsGoalData
): Promise<Goal> {
  // Validate account if provided
  if (data.accountId) {
    const account = await prisma.account.findFirst({
      where: {
        id: data.accountId,
        userId,
        archivedAt: null
      }
    });

    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }
  }

  const targetValue = new Decimal(data.targetValue);
  const currentValue = data.currentValue ? new Decimal(data.currentValue) : new Decimal(0);

  return await prisma.goal.create({
    data: {
      userId,
      goalType: 'savings' as GoalType,
      name: data.name,
      targetAmount: targetValue,
      currentAmount: currentValue,
      accountId: data.accountId || null,
      targetDate: data.targetCompletionOn ? new Date(data.targetCompletionOn) : null,
      imageUrl: data.imageUrl || null,
      metadata: {
        initialValue: data.currentValue || '0.00',
        monthlyContribution: data.monthlyContribution || '0.00'
      }
    }
  });
}

export async function updateSavingsGoal(
  userId: bigint,
  goalId: bigint,
  data: UpdateSavingsGoalData
): Promise<Goal | null> {
  // Verify ownership
  const existing = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
      goalType: 'savings' as GoalType,
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
        archivedAt: null
      }
    });

    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }
  }

  // Build update data
  const updateData: any = {};
  const metadata = existing.metadata as any;

  if (data.name !== undefined) updateData.name = data.name;
  if (data.targetValue !== undefined) updateData.targetAmount = new Decimal(data.targetValue);
  if (data.currentValue !== undefined) updateData.currentAmount = new Decimal(data.currentValue);
  if (data.accountId !== undefined) updateData.accountId = data.accountId;
  if (data.targetCompletionOn !== undefined) {
    updateData.targetDate = data.targetCompletionOn ? new Date(data.targetCompletionOn) : null;
  }
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

  if (data.monthlyContribution !== undefined) {
    updateData.metadata = {
      ...metadata,
      monthlyContribution: data.monthlyContribution
    };
  }

  return await prisma.goal.update({
    where: { id: goalId },
    data: updateData
  });
}

export async function deleteSavingsGoal(
  userId: bigint,
  goalId: bigint
): Promise<boolean> {
  const result = await prisma.goal.updateMany({
    where: {
      id: goalId,
      userId,
      goalType: 'savings' as GoalType,
      deletedAt: null
    },
    data: {
      deletedAt: new Date()
    }
  });

  return result.count > 0;
}

export async function archiveSavingsGoal(
  userId: bigint,
  goalId: bigint
): Promise<boolean> {
  const result = await prisma.goal.updateMany({
    where: {
      id: goalId,
      userId,
      goalType: 'savings' as GoalType,
      deletedAt: null
    },
    data: {
      archivedAt: new Date()
    }
  });

  return result.count > 0;
}

// =============================================================================
// CALCULATION HELPERS
// =============================================================================

export function calculateProgress(goal: Goal): number {
  const metadata = goal.metadata as any;

  if (goal.goalType === 'payoff') {
    // For payoff: progress = (initial - current) / initial * 100
    const initialValue = metadata.initialValue
      ? new Decimal(metadata.initialValue)
      : goal.currentAmount;

    if (initialValue.lte(0)) return 100;

    const paidOff = initialValue.sub(goal.currentAmount);
    return Math.min(100, Math.max(0, paidOff.div(initialValue).mul(100).toNumber()));
  } else {
    // For savings: progress = current / target * 100
    if (goal.targetAmount.lte(0)) return 0;
    return Math.min(100, Math.max(0, goal.currentAmount.div(goal.targetAmount).mul(100).toNumber()));
  }
}

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
  const startDate = goal.createdAt;

  const totalDays = Math.floor((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (totalDays <= 0) return 'under';

  const expectedProgress = (elapsedDays / totalDays) * 100;

  // Risk if actual progress is more than 10% behind expected progress
  if (progress < expectedProgress - 10) return 'risk';
  return 'under';
}
