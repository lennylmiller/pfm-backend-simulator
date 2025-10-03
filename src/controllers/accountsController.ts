import { Request, Response } from 'express';
import { accountService } from '../services/accountService';
import { logger } from '../config/logger';
import { serialize, wrapInArray } from '../utils/serializers';

export const getAllAccounts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Verify user context matches
    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const accounts = await accountService.getAllAccounts(userId);

    return res.json(serialize({ accounts }));
  } catch (error) {
    logger.error({ error }, 'Failed to get all accounts');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccount = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const account = await accountService.getAccountById(userId, id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Wrap single account in array for frontend compatibility
    const wrapped = wrapInArray(account, 'accounts');
    return res.json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to get account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const { account } = req.body;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await accountService.updateAccount(userId, id, account);

    const wrapped = wrapInArray(updated, 'accounts');
    return res.json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to update account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const archiveAccount = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const account = await accountService.archiveAccount(userId, id);

    const wrapped = wrapInArray(account, 'accounts');
    return res.json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to archive account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await accountService.deleteAccount(userId, id);

    return res.status(204).send();
  } catch (error) {
    logger.error({ error }, 'Failed to delete account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccountInvestments = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const investments = await accountService.getAccountInvestments(userId, id);
    return res.json(serialize(investments));
  } catch (error) {
    logger.error({ error }, 'Failed to get account investments');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccountTransactions = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await accountService.getAccountTransactions(userId, id, page);
    return res.json(serialize(result));
  } catch (error) {
    logger.error({ error }, 'Failed to get account transactions');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPotentialCashflowAccounts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const accounts = await accountService.getPotentialCashflowAccounts(userId);
    return res.json(serialize({ accounts }));
  } catch (error) {
    logger.error({ error }, 'Failed to get potential cashflow accounts');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
