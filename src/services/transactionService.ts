/**
 * Transaction Service
 * Business logic for transaction operations with account balance management
 */

import { prisma } from '../config/database';
import { Transaction, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CreateTransactionData {
  accountId: bigint;
  amount: string;
  transactionType?: TransactionType;
  postedAt: Date;
  transactedAt?: Date;
  description?: string;
  originalDescription?: string;
  nickname?: string;
  merchantName?: string;
  primaryTagId?: bigint;
  checkNumber?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTransactionData {
  nickname?: string;
  primaryTagId?: bigint | null;
  metadata?: Record<string, any>;
}

export interface SearchFilters {
  query?: string;
  untagged?: boolean;
  tags?: string[];
  beginOn?: string;
  endOn?: string;
}

// =============================================================================
// TRANSACTION OPERATIONS
// =============================================================================

/**
 * Create a new transaction and update account balance
 */
export async function createTransaction(
  userId: bigint,
  data: CreateTransactionData
): Promise<Transaction> {
  // Verify account ownership
  const account = await prisma.account.findFirst({
    where: {
      id: data.accountId,
      userId,
    },
  });

  if (!account) {
    throw new Error('Account not found or does not belong to user');
  }

  const amount = new Decimal(data.amount);

  // Determine transaction type if not provided
  let transactionType = data.transactionType;
  if (!transactionType) {
    transactionType = amount.isNegative() ? TransactionType.debit : TransactionType.credit;
  }

  // Create transaction and update account balance in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create transaction
    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId: data.accountId,
        amount,
        transactionType,
        postedAt: data.postedAt,
        transactedAt: data.transactedAt || null,
        description: data.description || null,
        originalDescription: data.originalDescription || null,
        nickname: data.nickname || null,
        merchantName: data.merchantName || null,
        primaryTagId: data.primaryTagId || null,
        checkNumber: data.checkNumber || null,
        metadata: data.metadata || {},
      },
    });

    // Update account balance
    const currentAccount = await tx.account.findUnique({
      where: { id: data.accountId },
    });

    if (currentAccount) {
      const newBalance = currentAccount.balance.add(amount);
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: newBalance,
          latestTransactionPostedAt: data.postedAt,
          updatedAt: new Date(),
        },
      });
    }

    return transaction;
  });

  return result;
}

/**
 * Update a transaction (limited fields)
 */
export async function updateTransaction(
  userId: bigint,
  transactionId: bigint,
  data: UpdateTransactionData
): Promise<Transaction | null> {
  // Verify ownership
  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      nickname: data.nickname,
      primaryTagId: data.primaryTagId,
      metadata: data.metadata,
      updatedAt: new Date(),
    },
  });
}

/**
 * Soft delete a transaction and update account balance
 */
export async function deleteTransaction(userId: bigint, transactionId: bigint): Promise<boolean> {
  // Verify ownership
  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return false;
  }

  // Soft delete transaction and reverse account balance
  await prisma.$transaction(async (tx) => {
    // Soft delete transaction
    await tx.transaction.update({
      where: { id: transactionId },
      data: { deletedAt: new Date() },
    });

    // Reverse balance change
    const currentAccount = await tx.account.findUnique({
      where: { id: existing.accountId },
    });

    if (currentAccount) {
      const newBalance = currentAccount.balance.sub(existing.amount);
      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          balance: newBalance,
          updatedAt: new Date(),
        },
      });
    }
  });

  return true;
}

/**
 * Search transactions with filters
 */
export async function searchTransactions(
  userId: bigint,
  filters: SearchFilters
): Promise<Transaction[]> {
  const where: any = {
    userId,
    deletedAt: null,
  };

  // Text search filter
  if (filters.query) {
    where.OR = [
      { description: { contains: filters.query, mode: 'insensitive' } },
      { originalDescription: { contains: filters.query, mode: 'insensitive' } },
      { nickname: { contains: filters.query, mode: 'insensitive' } },
      { merchantName: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  // Untagged filter
  if (filters.untagged) {
    where.primaryTagId = null;
  }

  // Date range filters
  if (filters.beginOn) {
    where.postedAt = {
      ...where.postedAt,
      gte: new Date(filters.beginOn),
    };
  }

  if (filters.endOn) {
    where.postedAt = {
      ...where.postedAt,
      lte: new Date(filters.endOn),
    };
  }

  return await prisma.transaction.findMany({
    where,
    orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(
  userId: bigint,
  transactionId: bigint
): Promise<Transaction | null> {
  return await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      userId,
      deletedAt: null,
    },
  });
}

/**
 * Get transactions for a specific account
 */
export async function getAccountTransactions(
  userId: bigint,
  accountId: bigint,
  page: number = 1,
  pageSize: number = 50
): Promise<{ transactions: Transaction[]; totalCount: number }> {
  // Verify account ownership
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
  });

  if (!account) {
    throw new Error('Account not found or does not belong to user');
  }

  const skip = (page - 1) * pageSize;

  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        accountId,
        userId,
        deletedAt: null,
      },
      orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({
      where: {
        accountId,
        userId,
        deletedAt: null,
      },
    }),
  ]);

  return { transactions, totalCount };
}
