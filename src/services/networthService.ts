import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database';
import { AccountState, AccountType } from '@prisma/client';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface NetworthSummary {
  assets: string;
  liabilities: string;
  networth: string;
  asOfDate: string;
}

export interface AccountBreakdown {
  accountId: number;
  accountName: string;
  accountType: string;
  category: 'asset' | 'liability';
  balance: string;
  contribution: string;
}

export interface NetworthDetailed {
  assets: string;
  liabilities: string;
  networth: string;
  asOfDate: string;
  breakdown: {
    assets: AccountBreakdown[];
    liabilities: AccountBreakdown[];
  };
}

export interface NetworthHistory {
  month: string;
  year: number;
  assets: string;
  liabilities: string;
  networth: string;
}

// =============================================================================
// ACCOUNT TYPE CATEGORIZATION
// =============================================================================

// Asset account types (positive networth contribution)
const ASSET_TYPES: AccountType[] = [
  AccountType.checking,
  AccountType.savings,
  AccountType.investment,
];

// Liability account types (negative networth contribution)
const LIABILITY_TYPES: AccountType[] = [
  AccountType.credit_card,
  AccountType.loan,
  AccountType.mortgage,
  AccountType.line_of_credit,
];

/**
 * Categorize an account as asset or liability based on account type and balance
 *
 * Rules:
 * - Known asset types: checking, savings, investment → asset
 * - Known liability types: credit_card, loan, mortgage, line_of_credit → liability
 * - "other" type: categorize by balance (positive → asset, negative → liability)
 */
function categorizeAccount(account: {
  accountType: AccountType;
  balance: Decimal;
}): 'asset' | 'liability' {
  // Check liability types first
  if (LIABILITY_TYPES.includes(account.accountType)) {
    return 'liability';
  }

  // Check asset types
  if (ASSET_TYPES.includes(account.accountType)) {
    return 'asset';
  }

  // For 'other' type, categorize by balance sign
  if (account.accountType === AccountType.other) {
    return account.balance.isNegative() ? 'liability' : 'asset';
  }

  // Default to asset (safety fallback)
  return 'asset';
}

// =============================================================================
// DECIMAL PRECISION CALCULATIONS
// =============================================================================

/**
 * Calculate total assets from accounts
 * CRITICAL: Uses Decimal arithmetic for precision
 */
function calculateAssets(accounts: Array<{ accountType: AccountType; balance: Decimal }>): Decimal {
  return accounts
    .filter(a => categorizeAccount(a) === 'asset')
    .reduce((sum, account) => {
      return sum.add(account.balance);
    }, new Decimal(0));
}

/**
 * Calculate total liabilities from accounts
 * CRITICAL: Uses Decimal arithmetic, takes absolute value of balances
 */
function calculateLiabilities(accounts: Array<{ accountType: AccountType; balance: Decimal }>): Decimal {
  return accounts
    .filter(a => categorizeAccount(a) === 'liability')
    .reduce((sum, account) => {
      // Liabilities stored as negative, take absolute value
      return sum.add(account.balance.abs());
    }, new Decimal(0));
}

/**
 * Calculate total networth (assets - liabilities)
 * CRITICAL: Uses Decimal arithmetic for precision
 */
function calculateTotal(assets: Decimal, liabilities: Decimal): Decimal {
  return assets.sub(liabilities);
}

// =============================================================================
// ACCOUNT BREAKDOWN CREATION
// =============================================================================

interface AccountForBreakdown {
  id: bigint;
  name: string;
  displayName: string | null;
  accountType: AccountType;
  balance: Decimal;
}

/**
 * Create detailed account breakdown for networth display
 * Shows each account's contribution to total networth
 */
function createAccountBreakdown(accounts: AccountForBreakdown[]): AccountBreakdown[] {
  return accounts.map(account => {
    const category = categorizeAccount(account);

    // For assets: contribution is positive balance
    // For liabilities: contribution is the balance (which should already be negative)
    // If liability balance is stored as positive, make it negative
    const contribution = category === 'asset'
      ? account.balance
      : account.balance.isPositive() ? account.balance.neg() : account.balance;

    return {
      accountId: Number(account.id),
      accountName: account.displayName || account.name,
      accountType: account.accountType,
      category,
      balance: account.balance.toFixed(2),
      contribution: contribution.toFixed(2)
    };
  });
}

// =============================================================================
// PUBLIC SERVICE FUNCTIONS
// =============================================================================

/**
 * Calculate current networth summary
 *
 * @param userId - User ID (BigInt)
 * @param partnerId - Partner ID (BigInt)
 * @param asOfDate - Optional date for historical networth (future feature)
 * @returns Networth summary with assets, liabilities, and total
 */
export async function calculateNetworth(
  userId: bigint,
  partnerId: bigint,
  asOfDate?: Date
): Promise<NetworthSummary> {
  // Query accounts with includeInNetworth flag
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      partnerId,
      includeInNetworth: true,  // CRITICAL: respect user preference
      archivedAt: null,         // Exclude archived accounts
      state: AccountState.active // Only active accounts
    },
    select: {
      id: true,
      accountType: true,
      balance: true
    }
  });

  // Calculate assets and liabilities with Decimal precision
  const assets = calculateAssets(accounts);
  const liabilities = calculateLiabilities(accounts);
  const networth = calculateTotal(assets, liabilities);

  return {
    assets: assets.toFixed(2),
    liabilities: liabilities.toFixed(2),
    networth: networth.toFixed(2),
    asOfDate: (asOfDate || new Date()).toISOString()
  };
}

/**
 * Calculate networth with detailed account breakdown
 *
 * @param userId - User ID (BigInt)
 * @param partnerId - Partner ID (BigInt)
 * @param asOfDate - Optional date for historical networth (future feature)
 * @returns Detailed networth with per-account breakdown
 */
export async function calculateNetworthWithBreakdown(
  userId: bigint,
  partnerId: bigint,
  asOfDate?: Date
): Promise<NetworthDetailed> {
  // Query accounts with full details for breakdown
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      partnerId,
      includeInNetworth: true,  // CRITICAL: respect user preference
      archivedAt: null,         // Exclude archived accounts
      state: AccountState.active // Only active accounts
    },
    select: {
      id: true,
      name: true,
      displayName: true,
      accountType: true,
      balance: true
    }
  });

  // Calculate totals
  const assets = calculateAssets(accounts);
  const liabilities = calculateLiabilities(accounts);
  const networth = calculateTotal(assets, liabilities);

  // Create breakdown
  const breakdown = createAccountBreakdown(accounts);

  // Separate assets and liabilities
  const assetAccounts = breakdown.filter(a => a.category === 'asset');
  const liabilityAccounts = breakdown.filter(a => a.category === 'liability');

  return {
    assets: assets.toFixed(2),
    liabilities: liabilities.toFixed(2),
    networth: networth.toFixed(2),
    asOfDate: (asOfDate || new Date()).toISOString(),
    breakdown: {
      assets: assetAccounts,
      liabilities: liabilityAccounts
    }
  };
}

/**
 * Calculate historical networth for trend analysis
 *
 * NOTE: This is a placeholder for future implementation
 * True historical networth requires balance history tracking
 *
 * @param userId - User ID (BigInt)
 * @param partnerId - Partner ID (BigInt)
 * @param months - Number of months to look back
 * @returns Historical networth data points
 */
export async function calculateHistoricalNetworth(
  userId: bigint,
  partnerId: bigint,
  months: number
): Promise<NetworthHistory[]> {
  // TODO: Implement once balance history tracking is added
  // For now, return current networth only
  const current = await calculateNetworth(userId, partnerId);
  const now = new Date();

  return [{
    month: now.toISOString().substring(0, 7), // YYYY-MM format
    year: now.getFullYear(),
    assets: current.assets,
    liabilities: current.liabilities,
    networth: current.networth
  }];
}
