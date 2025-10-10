import { Request, Response } from 'express';
import * as accountService from '../services/accountService';
import * as transactionService from '../services/transactionService';
import { logger } from '../config/logger';
import { serialize, wrapInArray } from '../utils/serializers';
import { validateAccountCreate } from '../validators/accountSchemas';
import { AuthContext } from '../types/auth';

interface AuthenticatedRequest extends Request {
  context?: AuthContext;
}

export const getAllAccounts = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params;

    // Verify user context matches
    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const partnerIdBigInt = BigInt(authReq.context!.partnerId);

    const accounts = await accountService.getAllAccounts(userIdBigInt, partnerIdBigInt);

    return res.json(serialize({ accounts }));
  } catch (error) {
    logger.error({ error }, 'Failed to get all accounts');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccount = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, id } = req.params;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const accountIdBigInt = BigInt(id);

    const account = await accountService.getAccountById(userIdBigInt, accountIdBigInt);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Return single account (not wrapped in array)
    return res.json({ account: serialize(account) });
  } catch (error) {
    logger.error({ error }, 'Failed to get account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, id } = req.params;
    const { account } = req.body;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const accountIdBigInt = BigInt(id);

    // Map snake_case fields to camelCase for service
    const accountData = {
      name: account.name,
      displayName: account.display_name,
      includeInNetworth: account.include_in_networth,
      includeInCashflow: account.include_in_cashflow,
      includeInExpenses: account.include_in_expenses,
      includeInBudget: account.include_in_budget,
      includeInGoals: account.include_in_goals,
      includeInDashboard: account.include_in_dashboard,
      ordering: account.ordering,
    };

    const updated = await accountService.updateAccount(userIdBigInt, accountIdBigInt, accountData);

    return res.json({ account: serialize(updated) });
  } catch (error) {
    logger.error({ error }, 'Failed to update account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const archiveAccount = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, id } = req.params;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const accountIdBigInt = BigInt(id);

    const account = await accountService.archiveAccount(userIdBigInt, accountIdBigInt);

    return res.json({ account: serialize(account) });
  } catch (error) {
    logger.error({ error }, 'Failed to archive account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, id } = req.params;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const accountIdBigInt = BigInt(id);

    await accountService.deleteAccount(userIdBigInt, accountIdBigInt);

    return res.status(204).send();
  } catch (error) {
    logger.error({ error }, 'Failed to delete account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccountInvestments = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, id } = req.params;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const accountIdBigInt = BigInt(id);

    const investments = await accountService.getAccountInvestments(userIdBigInt, accountIdBigInt);
    return res.json(serialize(investments));
  } catch (error) {
    logger.error({ error }, 'Failed to get account investments');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccountTransactions = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, id } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const accountIdBigInt = BigInt(id);

    const result = await transactionService.getAccountTransactions(
      userIdBigInt,
      accountIdBigInt,
      page
    );
    return res.json(serialize(result));
  } catch (error) {
    logger.error({ error }, 'Failed to get account transactions');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPotentialCashflowAccounts = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const partnerIdBigInt = BigInt(authReq.context!.partnerId);

    const accounts = await accountService.getPotentialCashflowAccounts(
      userIdBigInt,
      partnerIdBigInt
    );
    return res.json(serialize({ accounts }));
  } catch (error) {
    logger.error({ error }, 'Failed to get potential cashflow accounts');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAccount = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params;
    const { account } = req.body;

    if (userId !== authReq.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(authReq.context!.userId);
    const partnerIdBigInt = BigInt(authReq.context!.partnerId);

    // Validate request body
    const validated = validateAccountCreate(account);

    // Map validated data to CreateAccountData interface
    const accountData = {
      name: validated.name,
      displayName: validated.display_name,
      accountType: validated.account_type,
      aggregationType: validated.aggregation_type,
      balance: validated.balance,
      number: validated.number,
      description: validated.description,
      includeInNetworth: validated.include_in_networth,
      includeInCashflow: validated.include_in_cashflow,
      includeInExpenses: validated.include_in_expenses,
      includeInBudget: validated.include_in_budget,
      includeInGoals: validated.include_in_goals,
      includeInDashboard: validated.include_in_dashboard,
      ordering: validated.ordering,
    };

    const created = await accountService.createAccount(userIdBigInt, partnerIdBigInt, accountData);
    const wrapped = wrapInArray(created, 'accounts');
    return res.status(201).json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to create account');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
