/**
 * Goals Controller
 * Handles payoff and savings goal CRUD operations
 */

import { Request, Response, NextFunction } from 'express';
import * as goalService from '../services/goalService';
import { validatePayoffGoal, validateSavingsGoal } from '../validators/goalSchemas';
import { serializeGoal } from '../utils/serializers';
import { logger } from '../config/logger';

// Static goal image data
const PAYOFF_GOAL_IMAGES = [
  {
    id: 'credit_card',
    name: 'Credit Card',
    image_url: 'https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg',
  },
  {
    id: 'student_loan',
    name: 'Student Loan',
    image_url: 'https://content.geezeo.com/images/payoff_goal_images/student_loan.jpg',
  },
  {
    id: 'car_loan',
    name: 'Car Loan',
    image_url: 'https://content.geezeo.com/images/payoff_goal_images/car_loan.jpg',
  },
  {
    id: 'mortgage',
    name: 'Mortgage',
    image_url: 'https://content.geezeo.com/images/payoff_goal_images/mortgage.jpg',
  },
  {
    id: 'personal_loan',
    name: 'Personal Loan',
    image_url: 'https://content.geezeo.com/images/payoff_goal_images/personal_loan.jpg',
  },
];

const SAVINGS_GOAL_IMAGES = [
  {
    id: 'vacation',
    name: 'Vacation',
    image_url: 'https://content.geezeo.com/images/savings_goal_images/vacation.jpg',
  },
  {
    id: 'emergency_fund',
    name: 'Emergency Fund',
    image_url: 'https://content.geezeo.com/images/savings_goal_images/emergency_fund.jpg',
  },
  {
    id: 'down_payment',
    name: 'Down Payment',
    image_url: 'https://content.geezeo.com/images/savings_goal_images/down_payment.jpg',
  },
  {
    id: 'retirement',
    name: 'Retirement',
    image_url: 'https://content.geezeo.com/images/savings_goal_images/retirement.jpg',
  },
  {
    id: 'car',
    name: 'Car',
    image_url: 'https://content.geezeo.com/images/savings_goal_images/car.jpg',
  },
  {
    id: 'wedding',
    name: 'Wedding',
    image_url: 'https://content.geezeo.com/images/savings_goal_images/wedding.jpg',
  },
];

// =============================================================================
// PAYOFF GOALS
// =============================================================================

export async function listPayoffGoals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const includeArchived = req.query.include_archived === 'true';

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const goals = await goalService.getPayoffGoals(userId, { includeArchived });
    const serialized = goals.map((goal) =>
      serializeGoal(goal, 'payoff', goalService.calculateProgress, goalService.calculateStatus)
    );

    res.status(200).json({ payoff_goals: serialized });
  } catch (error) {
    logger.error({ error, userId: req.params.userId }, 'Failed to list payoff goals');
    next(error);
  }
}

export async function getPayoffGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const goal = await goalService.getPayoffGoalById(userId, goalId);

    if (!goal) {
      res.status(404).json({ error: 'Payoff goal not found' });
      return;
    }

    const serialized = serializeGoal(
      goal,
      'payoff',
      goalService.calculateProgress,
      goalService.calculateStatus
    );
    res.status(200).json({ payoff_goal: serialized });
  } catch (error) {
    logger.error({ error, goalId: req.params.id }, 'Failed to get payoff goal');
    next(error);
  }
}

export async function createPayoffGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalData = req.body.payoff_goal;

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const validatedData = validatePayoffGoal(goalData);

    const goal = await goalService.createPayoffGoal(userId, {
      name: validatedData.name,
      currentValue: validatedData.current_value,
      accountId: validatedData.account_id,
      targetCompletionOn: validatedData.target_completion_on,
      monthlyContribution: validatedData.monthly_contribution,
      imageUrl: validatedData.image_url,
    });

    const serialized = serializeGoal(
      goal,
      'payoff',
      goalService.calculateProgress,
      goalService.calculateStatus
    );
    res.status(201).json({ payoff_goal: serialized });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    logger.error({ error, userId: req.params.userId }, 'Failed to create payoff goal');
    next(error);
  }
}

export async function updatePayoffGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);
    const updates = req.body.payoff_goal;

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const validatedData = validatePayoffGoal(updates, { partial: true });

    const goal = await goalService.updatePayoffGoal(userId, goalId, {
      name: validatedData.name,
      currentValue: validatedData.current_value,
      accountId: validatedData.account_id,
      targetCompletionOn: validatedData.target_completion_on,
      monthlyContribution: validatedData.monthly_contribution,
      imageUrl: validatedData.image_url,
    });

    if (!goal) {
      res.status(404).json({ error: 'Payoff goal not found' });
      return;
    }

    const serialized = serializeGoal(
      goal,
      'payoff',
      goalService.calculateProgress,
      goalService.calculateStatus
    );
    res.status(200).json({ payoff_goal: serialized });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    logger.error({ error, goalId: req.params.id }, 'Failed to update payoff goal');
    next(error);
  }
}

export async function deletePayoffGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

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

export async function archivePayoffGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

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

// =============================================================================
// SAVINGS GOALS
// =============================================================================

export async function listSavingsGoals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const includeArchived = req.query.include_archived === 'true';

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const goals = await goalService.getSavingsGoals(userId, { includeArchived });
    const serialized = goals.map((goal) =>
      serializeGoal(goal, 'savings', goalService.calculateProgress, goalService.calculateStatus)
    );

    res.status(200).json({ savings_goals: serialized });
  } catch (error) {
    logger.error({ error, userId: req.params.userId }, 'Failed to list savings goals');
    next(error);
  }
}

export async function getSavingsGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const goal = await goalService.getSavingsGoalById(userId, goalId);

    if (!goal) {
      res.status(404).json({ error: 'Savings goal not found' });
      return;
    }

    const serialized = serializeGoal(
      goal,
      'savings',
      goalService.calculateProgress,
      goalService.calculateStatus
    );
    res.status(200).json({ savings_goal: serialized });
  } catch (error) {
    logger.error({ error, goalId: req.params.id }, 'Failed to get savings goal');
    next(error);
  }
}

export async function createSavingsGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalData = req.body.savings_goal;

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const validatedData = validateSavingsGoal(goalData);

    const goal = await goalService.createSavingsGoal(userId, {
      name: validatedData.name,
      targetValue: validatedData.target_value,
      currentValue: validatedData.current_value,
      accountId: validatedData.account_id,
      targetCompletionOn: validatedData.target_completion_on,
      monthlyContribution: validatedData.monthly_contribution,
      imageUrl: validatedData.image_url,
    });

    const serialized = serializeGoal(
      goal,
      'savings',
      goalService.calculateProgress,
      goalService.calculateStatus
    );
    res.status(201).json({ savings_goal: serialized });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    logger.error({ error, userId: req.params.userId }, 'Failed to create savings goal');
    next(error);
  }
}

export async function updateSavingsGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);
    const updates = req.body.savings_goal;

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const validatedData = validateSavingsGoal(updates, { partial: true });

    const goal = await goalService.updateSavingsGoal(userId, goalId, {
      name: validatedData.name,
      targetValue: validatedData.target_value,
      currentValue: validatedData.current_value,
      accountId: validatedData.account_id,
      targetCompletionOn: validatedData.target_completion_on,
      monthlyContribution: validatedData.monthly_contribution,
      imageUrl: validatedData.image_url,
    });

    if (!goal) {
      res.status(404).json({ error: 'Savings goal not found' });
      return;
    }

    const serialized = serializeGoal(
      goal,
      'savings',
      goalService.calculateProgress,
      goalService.calculateStatus
    );
    res.status(200).json({ savings_goal: serialized });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    logger.error({ error, goalId: req.params.id }, 'Failed to update savings goal');
    next(error);
  }
}

export async function deleteSavingsGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const deleted = await goalService.deleteSavingsGoal(userId, goalId);

    if (!deleted) {
      res.status(404).json({ error: 'Savings goal not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error({ error, goalId: req.params.id }, 'Failed to delete savings goal');
    next(error);
  }
}

export async function archiveSavingsGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const goalId = BigInt(req.params.id);

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const archived = await goalService.archiveSavingsGoal(userId, goalId);

    if (!archived) {
      res.status(404).json({ error: 'Savings goal not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error({ error, goalId: req.params.id }, 'Failed to archive savings goal');
    next(error);
  }
}

// =============================================================================
// GOAL IMAGES
// =============================================================================

export async function listPayoffGoalImages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(200).json({ payoff_goals: PAYOFF_GOAL_IMAGES });
  } catch (error) {
    logger.error({ error }, 'Failed to list payoff goal images');
    next(error);
  }
}

export async function listSavingsGoalImages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(200).json({ savings_goals: SAVINGS_GOAL_IMAGES });
  } catch (error) {
    logger.error({ error }, 'Failed to list savings goal images');
    next(error);
  }
}
