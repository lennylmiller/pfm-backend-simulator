import { Request, Response } from 'express';
import * as transactionService from '../services/transactionService';
import { logger } from '../config/logger';
import { serialize, wrapInArray } from '../utils/serializers';

export const searchTransactions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { q, untagged, tags, begin_on, end_on } = req.query;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await transactionService.searchTransactions(userId, {
      query: q as string,
      untagged: untagged === '1' || untagged === 'true',
      tags: Array.isArray(tags) ? tags as string[] : tags ? [tags as string] : undefined,
      beginOn: begin_on as string,
      endOn: end_on as string
    });

    return res.json(serialize(result));
  } catch (error) {
    logger.error({ error }, 'Failed to search transactions');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const { transaction } = req.body;
    const { repeat } = req.query;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await transactionService.updateTransaction(
      userId,
      id,
      transaction,
      repeat === 'true'
    );

    const wrapped = wrapInArray(updated, 'transactions');
    return res.json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to update transaction');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await transactionService.deleteTransaction(userId, id);

    return res.status(204).send();
  } catch (error) {
    logger.error({ error }, 'Failed to delete transaction');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
