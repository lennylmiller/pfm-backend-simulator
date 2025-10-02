import { Request, Response } from 'express';
import { accountService } from '../services/accountService';
import { logger } from '../config/logger';

export const getAllAccounts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Verify user context matches
    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const accounts = await accountService.getAllAccounts(userId);

    return res.json({ accounts });
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

    return res.json({ account });
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

    return res.json({ account: updated });
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

    return res.json({ account });
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
