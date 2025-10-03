import { Request, Response } from 'express';
import { expenseService } from '../services/expenseService';
import { logger } from '../config/logger';
import { serialize } from '../utils/serializers';

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { begin_on, end_on, threshold } = req.query;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const expenses = await expenseService.getExpenses(userId, {
      beginOn: begin_on as string,
      endOn: end_on as string,
      threshold: threshold ? parseFloat(threshold as string) : undefined
    });

    return res.json(serialize({ expenses }));
  } catch (error) {
    logger.error({ error }, 'Failed to get expenses');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
