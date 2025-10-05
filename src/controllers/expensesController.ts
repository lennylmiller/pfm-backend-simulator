import { Request, Response } from 'express';
import * as expenseService from '../services/expenseService';
import { logger } from '../config/logger';
import {
  serializeExpensesSummary,
  serializeExpensesByCategory,
  serializeExpensesByMerchant,
  serializeExpensesByTag,
  serializeExpensesTrends,
  serializeExpensesComparison,
} from '../utils/serializers';
import { AuthContext } from '../types/auth';

interface AuthenticatedRequest extends Request {
  context?: AuthContext;
}

/**
 * GET /users/:userId/expenses
 * Get expenses summary with optional grouping and filtering
 */
export const getExpensesSummary = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params;
    const { period, start_date, end_date, group_by, include_tags, exclude_tags } = req.query;

    // Verify user authorization
    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const partnerIdBigInt = BigInt(authReq.context!.partnerId);

    // Parse tag filtering
    const includeTagIds = include_tags
      ? (Array.isArray(include_tags) ? include_tags : [include_tags]).map((id: any) => BigInt(id))
      : undefined;

    const excludeTagIds = exclude_tags
      ? (Array.isArray(exclude_tags) ? exclude_tags : [exclude_tags]).map((id: any) => BigInt(id))
      : undefined;

    // Parse dates if custom period
    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    // Get expenses summary
    const summary = await expenseService.getExpensesSummary(userIdBigInt, partnerIdBigInt, {
      period:
        (period as 'this_month' | 'last_month' | 'last_thirty_days' | 'custom') || 'this_month',
      startDate,
      endDate,
      groupBy: group_by as 'category' | 'merchant' | 'tag' | undefined,
      includeTagIds,
      excludeTagIds,
    });

    return res.json({ expenses: serializeExpensesSummary(summary) });
  } catch (error) {
    logger.error({ error }, 'Failed to get expenses summary');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /users/:userId/expenses/categories
 * Get expenses grouped by category
 */
export const getExpensesByCategory = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params;
    const { start_date, end_date } = req.query;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const partnerIdBigInt = BigInt(authReq.context!.partnerId);

    // Default to current month if no dates provided
    const startDate = start_date
      ? new Date(start_date as string)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const endDate = end_date
      ? new Date(end_date as string)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const categories = await expenseService.getExpensesByCategory(
      userIdBigInt,
      partnerIdBigInt,
      startDate,
      endDate
    );

    return res.json({ categories: serializeExpensesByCategory(categories) });
  } catch (error) {
    logger.error({ error }, 'Failed to get expenses by category');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /users/:userId/expenses/merchants
 * Get expenses grouped by merchant
 */
export const getExpensesByMerchant = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params;
    const { start_date, end_date, limit } = req.query;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const partnerIdBigInt = BigInt(authReq.context!.partnerId);

    // Default to current month
    const startDate = start_date
      ? new Date(start_date as string)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const endDate = end_date
      ? new Date(end_date as string)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const limitNum = limit ? parseInt(limit as string) : undefined;

    const merchants = await expenseService.getExpensesByMerchant(
      userIdBigInt,
      partnerIdBigInt,
      startDate,
      endDate,
      limitNum
    );

    return res.json({ merchants: serializeExpensesByMerchant(merchants) });
  } catch (error) {
    logger.error({ error }, 'Failed to get expenses by merchant');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /users/:userId/expenses/tags/:tagId
 * Get expenses for a specific tag
 */
export const getExpensesByTag = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, tagId } = req.params;
    const { start_date, end_date } = req.query;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const partnerIdBigInt = BigInt(authReq.context!.partnerId);
    const tagIdBigInt = BigInt(tagId);

    // Default to current month
    const startDate = start_date
      ? new Date(start_date as string)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const endDate = end_date
      ? new Date(end_date as string)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const expenses = await expenseService.getExpensesByTag(
      userIdBigInt,
      partnerIdBigInt,
      tagIdBigInt,
      startDate,
      endDate
    );

    return res.json({ tag_expenses: serializeExpensesByTag(expenses) });
  } catch (error) {
    logger.error({ error }, 'Failed to get expenses by tag');

    if ((error as Error).message === 'Tag not found') {
      return res.status(404).json({ error: 'Tag not found' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /users/:userId/expenses/trends
 * Get monthly expense trends
 */
export const getExpensesTrends = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params;
    const { months } = req.query;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const partnerIdBigInt = BigInt(authReq.context!.partnerId);

    const monthsNum = months ? parseInt(months as string) : 6;

    const trends = await expenseService.getExpensesTrends(userIdBigInt, partnerIdBigInt, monthsNum);

    return res.json({ trends: serializeExpensesTrends(trends) });
  } catch (error) {
    logger.error({ error }, 'Failed to get expenses trends');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /users/:userId/expenses/comparison
 * Compare current month to previous month
 */
export const getExpensesComparison = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const partnerIdBigInt = BigInt(authReq.context!.partnerId);

    const comparison = await expenseService.getExpensesComparison(userIdBigInt, partnerIdBigInt);

    return res.json({ comparison: serializeExpensesComparison(comparison) });
  } catch (error) {
    logger.error({ error }, 'Failed to get expenses comparison');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
