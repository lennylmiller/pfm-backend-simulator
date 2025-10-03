import { Request, Response } from 'express';
import { budgetService } from '../services/budgetService';
import { logger } from '../config/logger';
import { serialize, wrapInArray } from '../utils/serializers';

export const getBudgets = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { start_date, end_date } = req.query;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const budgets = await budgetService.getBudgets(
      userId,
      start_date as string,
      end_date as string
    );

    return res.json(serialize(budgets));
  } catch (error) {
    logger.error({ error }, 'Failed to get budgets');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBudget = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const budget = await budgetService.getBudgetById(userId, id);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const wrapped = wrapInArray(budget, 'budgets');
    return res.json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to get budget');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBudget = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { budget } = req.body;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const created = await budgetService.createBudget(userId, budget);

    const wrapped = wrapInArray(created, 'budgets');
    return res.status(201).json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to create budget');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBudget = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const { budget } = req.body;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await budgetService.updateBudget(userId, id, budget);

    const wrapped = wrapInArray(updated, 'budgets');
    return res.json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to update budget');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBudget = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await budgetService.deleteBudget(userId, id);

    return res.status(204).send();
  } catch (error) {
    logger.error({ error }, 'Failed to delete budget');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
