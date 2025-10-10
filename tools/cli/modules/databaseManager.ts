import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';
import { DatabaseOperationResult, SeedOptions } from '../types/workflow';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Database Manager Module
 * Handles database operations: clear, seed, verify
 */

/**
 * Clear all seeded data from database
 * Preserves schema, removes all records in proper order to respect foreign keys
 */
export async function clearSeed(): Promise<DatabaseOperationResult> {
  const prisma = new PrismaClient();
  const startTime = Date.now();

  try {
    console.log(chalk.blue('\n🗑️  Clearing seed data...\n'));

    // Delete in reverse dependency order to avoid foreign key violations
    const deletions = [
      { name: 'Transactions', fn: () => prisma.transaction.deleteMany() },
      { name: 'Notifications', fn: () => prisma.notification.deleteMany() },
      { name: 'Alerts', fn: () => prisma.alert.deleteMany() },
      { name: 'CashflowEvents', fn: () => prisma.cashflowEvent.deleteMany() },
      { name: 'CashflowIncomes', fn: () => prisma.cashflowIncome.deleteMany() },
      { name: 'CashflowBills', fn: () => prisma.cashflowBill.deleteMany() },
      { name: 'Goals', fn: () => prisma.goal.deleteMany() },
      { name: 'Budgets', fn: () => prisma.budget.deleteMany() },
      { name: 'Tags', fn: () => prisma.tag.deleteMany() },
      { name: 'Accounts', fn: () => prisma.account.deleteMany() },
      { name: 'Users', fn: () => prisma.user.deleteMany() },
      { name: 'OAuthClients', fn: () => prisma.oAuthClient.deleteMany() },
      { name: 'Partners', fn: () => prisma.partner.deleteMany() },
    ];

    for (const deletion of deletions) {
      const result = await deletion.fn();
      console.log(chalk.gray(`  ✓ Deleted ${result.count} ${deletion.name}`));
    }

    const duration = Date.now() - startTime;

    console.log(chalk.green(`\n✅ Seed data cleared successfully in ${duration}ms\n`));

    return {
      success: true,
      message: 'Seed data cleared successfully',
      stats: { duration },
    };
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error clearing seed data: ${error.message}\n`));
    return {
      success: false,
      message: `Failed to clear seed data: ${error.message}`,
      error,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Regenerate seed data with configurable options
 * Uses the existing seed script with environment variables
 */
export async function regenerateSeed(options?: SeedOptions): Promise<DatabaseOperationResult> {
  const startTime = Date.now();

  try {
    console.log(chalk.blue('\n🌱 Regenerating seed data...\n'));

    // Build seed command with options
    const partnersCount = options?.partnersCount ?? 1;
    const usersPerPartner = options?.usersPerPartner ?? 10;
    const accountsPerUser = options?.accountsPerUser ?? 3;
    const transactionsPerAccount = options?.transactionsPerAccount ?? 100;

    const seedCommand = `npm run seed -- generate -p ${partnersCount} -u ${usersPerPartner} -a ${accountsPerUser} -t ${transactionsPerAccount}`;

    // Run seed script
    const backendPath = path.resolve(__dirname, '../../../');
    const { stdout, stderr } = await execAsync(seedCommand, {
      cwd: backendPath,
    });

    if (stderr && !stderr.includes('DeprecationWarning')) {
      console.log(chalk.yellow(`  ⚠️  Warnings:\n${stderr}`));
    }

    // Parse output to extract stats (if available in seed script output)
    const duration = Date.now() - startTime;

    console.log(chalk.green(`\n✅ Seed data regenerated successfully in ${duration}ms\n`));

    return {
      success: true,
      message: 'Seed data regenerated successfully',
      stats: {
        partnersCreated: options?.partnersCount ?? 1,
        usersCreated: (options?.partnersCount ?? 1) * (options?.usersPerPartner ?? 10),
        accountsCreated: (options?.partnersCount ?? 1) * (options?.usersPerPartner ?? 10) * (options?.accountsPerUser ?? 3),
        transactionsCreated: (options?.partnersCount ?? 1) * (options?.usersPerPartner ?? 10) * (options?.accountsPerUser ?? 3) * (options?.transactionsPerAccount ?? 100),
        duration,
      },
    };
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error regenerating seed data: ${error.message}\n`));
    return {
      success: false,
      message: `Failed to regenerate seed data: ${error.message}`,
      error,
    };
  }
}

/**
 * Verify database integrity and connection
 */
export async function verifyIntegrity(): Promise<DatabaseOperationResult> {
  const prisma = new PrismaClient();
  const startTime = Date.now();

  try {
    console.log(chalk.blue('\n🔍 Verifying database integrity...\n'));

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log(chalk.gray('  ✓ Database connection successful'));

    // Count records in key tables
    const [partnersCount, usersCount, accountsCount, transactionsCount] = await Promise.all([
      prisma.partner.count(),
      prisma.user.count(),
      prisma.account.count(),
      prisma.transaction.count(),
    ]);

    console.log(chalk.gray(`  ✓ Partners: ${partnersCount}`));
    console.log(chalk.gray(`  ✓ Users: ${usersCount}`));
    console.log(chalk.gray(`  ✓ Accounts: ${accountsCount}`));
    console.log(chalk.gray(`  ✓ Transactions: ${transactionsCount}`));

    const duration = Date.now() - startTime;

    console.log(chalk.green(`\n✅ Database integrity verified in ${duration}ms\n`));

    return {
      success: true,
      message: 'Database integrity verified',
      stats: {
        partnersCreated: partnersCount,
        usersCreated: usersCount,
        accountsCreated: accountsCount,
        transactionsCreated: transactionsCount,
        duration,
      },
    };
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Database verification failed: ${error.message}\n`));
    return {
      success: false,
      message: `Database verification failed: ${error.message}`,
      error,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  partners: number;
  users: number;
  accounts: number;
  transactions: number;
  budgets: number;
  goals: number;
  alerts: number;
}> {
  const prisma = new PrismaClient();

  try {
    const [partners, users, accounts, transactions, budgets, goals, alerts] = await Promise.all([
      prisma.partner.count(),
      prisma.user.count(),
      prisma.account.count(),
      prisma.transaction.count(),
      prisma.budget.count(),
      prisma.goal.count(),
      prisma.alert.count(),
    ]);

    return { partners, users, accounts, transactions, budgets, goals, alerts };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Check if database is empty (no seed data)
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  const prisma = new PrismaClient();

  try {
    const partnersCount = await prisma.partner.count();
    return partnersCount === 0;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Complete database reset: clear and regenerate
 */
export async function resetDatabase(options?: SeedOptions): Promise<DatabaseOperationResult> {
  console.log(chalk.blue.bold('\n🔄 Resetting Database\n'));
  console.log(chalk.gray('This will clear all data and regenerate seed data.\n'));

  // Step 1: Clear existing data
  const clearResult = await clearSeed();
  if (!clearResult.success) {
    return clearResult;
  }

  // Step 2: Regenerate seed data
  const seedResult = await regenerateSeed(options);
  if (!seedResult.success) {
    return seedResult;
  }

  // Step 3: Verify integrity
  const verifyResult = await verifyIntegrity();

  return {
    success: verifyResult.success,
    message: 'Database reset completed successfully',
    stats: {
      ...seedResult.stats,
      duration: (clearResult.stats?.duration ?? 0) + (seedResult.stats?.duration ?? 0) + (verifyResult.stats?.duration ?? 0),
    },
  };
}
