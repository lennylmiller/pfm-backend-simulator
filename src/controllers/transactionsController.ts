import { Request, Response } from 'express';
import * as transactionService from '../services/transactionService';
import { logger } from '../config/logger';
import { serialize, wrapInArray } from '../utils/serializers';
import { validateTransactionCreate } from '../validators/transactionSchemas';

export const searchTransactions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { q, untagged, tags, begin_on, end_on } = req.query;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(req.context!.userId);

    const result = await transactionService.searchTransactions(userIdBigInt, {
      query: q as string,
      untagged: untagged === '1' || untagged === 'true',
      tags: Array.isArray(tags) ? (tags as string[]) : tags ? [tags as string] : undefined,
      beginOn: begin_on as string,
      endOn: end_on as string,
    });

    return res.json(serialize({ transactions: result }));
  } catch (error) {
    logger.error({ error }, 'Failed to search transactions');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const { transaction } = req.body;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(req.context!.userId);
    const transactionIdBigInt = BigInt(id);

    const updated = await transactionService.updateTransaction(
      userIdBigInt,
      transactionIdBigInt,
      transaction
    );

    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

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

    const userIdBigInt = BigInt(req.context!.userId);
    const transactionIdBigInt = BigInt(id);

    const deleted = await transactionService.deleteTransaction(userIdBigInt, transactionIdBigInt);

    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error({ error }, 'Failed to delete transaction');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { transaction } = req.body;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(req.context!.userId);

    // Validate request body
    const validated = validateTransactionCreate(transaction);

    // Map validated data to CreateTransactionData interface
    const transactionData = {
      accountId: BigInt(validated.account_id),
      amount: validated.amount,
      postedAt: new Date(validated.posted_at),
      transactedAt: validated.transacted_at ? new Date(validated.transacted_at) : undefined,
      description: validated.description,
      merchantName: validated.merchant_name,
      nickname: validated.nickname,
      primaryTagId: validated.primary_tag_id ? BigInt(validated.primary_tag_id) : undefined,
    };

    const created = await transactionService.createTransaction(userIdBigInt, transactionData);
    const wrapped = wrapInArray(created, 'transactions');
    return res.status(201).json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to create transaction');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
