/**
 * Account Service
 * Business logic for account operations
 */

import { prisma } from '../config/database';
import { Account, AccountState, AccountType, AggregationType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CreateAccountData {
  name: string;
  displayName?: string;
  accountType: AccountType;
  aggregationType: AggregationType;
  balance: string;
  number?: string;
  description?: string;
  includeInNetworth: boolean;
  includeInCashflow: boolean;
  includeInExpenses: boolean;
  includeInBudget: boolean;
  includeInGoals: boolean;
  includeInDashboard: boolean;
  ordering: number;
}

export interface UpdateAccountData {
  name?: string;
  displayName?: string;
  includeInNetworth?: boolean;
  includeInCashflow?: boolean;
  includeInExpenses?: boolean;
  includeInBudget?: boolean;
  includeInGoals?: boolean;
  includeInDashboard?: boolean;
  ordering?: number;
}

// =============================================================================
// ACCOUNT OPERATIONS
// =============================================================================

/**
 * Get all active accounts for a user
 */
export async function getAllAccounts(
  userId: bigint,
  partnerId: bigint
): Promise<Account[]> {
  return await prisma.account.findMany({
    where: {
      userId,
      partnerId,
      archivedAt: null,
      state: AccountState.active,
    },
    orderBy: [
      { ordering: 'asc' },
      { createdAt: 'desc' }
    ],
  });
}

/**
 * Get a single account by ID
 */
export async function getAccountById(
  userId: bigint,
  accountId: bigint
): Promise<Account | null> {
  return await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
  });
}

/**
 * Create a new account
 */
export async function createAccount(
  userId: bigint,
  partnerId: bigint,
  data: CreateAccountData
): Promise<Account> {
  return await prisma.account.create({
    data: {
      userId,
      partnerId,
      name: data.name,
      displayName: data.displayName || null,
      accountType: data.accountType,
      displayAccountType: data.accountType,
      aggregationType: data.aggregationType,
      balance: new Decimal(data.balance),
      number: data.number || null,
      description: data.description || null,
      includeInNetworth: data.includeInNetworth,
      includeInCashflow: data.includeInCashflow,
      includeInExpenses: data.includeInExpenses,
      includeInBudget: data.includeInBudget,
      includeInGoals: data.includeInGoals,
      includeInDashboard: data.includeInDashboard,
      ordering: data.ordering,
      state: AccountState.active,
    },
  });
}

/**
 * Update an account
 */
export async function updateAccount(
  userId: bigint,
  accountId: bigint,
  data: UpdateAccountData
): Promise<Account | null> {
  // Verify ownership
  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.account.update({
    where: { id: accountId },
    data: {
      name: data.name,
      displayName: data.displayName,
      includeInNetworth: data.includeInNetworth,
      includeInCashflow: data.includeInCashflow,
      includeInExpenses: data.includeInExpenses,
      includeInBudget: data.includeInBudget,
      includeInGoals: data.includeInGoals,
      includeInDashboard: data.includeInDashboard,
      ordering: data.ordering,
      updatedAt: new Date(),
    },
  });
}

/**
 * Archive an account
 */
export async function archiveAccount(
  userId: bigint,
  accountId: bigint
): Promise<Account | null> {
  // Verify ownership
  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.account.update({
    where: { id: accountId },
    data: {
      archivedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete an account (hard delete)
 */
export async function deleteAccount(
  userId: bigint,
  accountId: bigint
): Promise<boolean> {
  // Verify ownership
  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.account.delete({
    where: { id: accountId },
  });

  return true;
}

/**
 * Update account balance (for transaction processing)
 * @internal Used by transaction service to maintain account balance
 */
export async function updateAccountBalance(
  accountId: bigint,
  balanceChange: Decimal
): Promise<void> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  const newBalance = account.balance.add(balanceChange);

  await prisma.account.update({
    where: { id: accountId },
    data: {
      balance: newBalance,
      updatedAt: new Date(),
    },
  });
}
