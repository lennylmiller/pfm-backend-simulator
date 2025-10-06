#!/usr/bin/env ts-node
/**
 * Test script for database manager
 * Run: npx ts-node tools/cli/modules/test-databaseManager.ts
 */

import {
  verifyIntegrity,
  getDatabaseStats,
  isDatabaseEmpty,
  clearSeed,
  regenerateSeed,
} from './databaseManager';
import chalk from 'chalk';

async function testDatabaseManager() {
  console.log(chalk.blue.bold('\n🧪 Testing Database Manager\n'));

  // Test 1: Verify database integrity
  console.log(chalk.gray('Test 1: Verify database integrity'));
  const integrityResult = await verifyIntegrity();
  if (integrityResult.success) {
    console.log(chalk.green('  ✅ Integrity verification passed\n'));
  } else {
    console.log(chalk.red('  ❌ Integrity verification failed\n'));
  }

  // Test 2: Get database stats
  console.log(chalk.gray('Test 2: Get database statistics'));
  const stats = await getDatabaseStats();
  console.log(chalk.gray(`  Partners: ${stats.partners}`));
  console.log(chalk.gray(`  Users: ${stats.users}`));
  console.log(chalk.gray(`  Accounts: ${stats.accounts}`));
  console.log(chalk.gray(`  Transactions: ${stats.transactions}`));
  console.log(chalk.gray(`  Budgets: ${stats.budgets}`));
  console.log(chalk.gray(`  Goals: ${stats.goals}`));
  console.log(chalk.gray(`  Alerts: ${stats.alerts}`));
  console.log(chalk.green('  ✅ Stats retrieved successfully\n'));

  // Test 3: Check if database is empty
  console.log(chalk.gray('Test 3: Check if database is empty'));
  const isEmpty = await isDatabaseEmpty();
  console.log(chalk.gray(`  Database empty: ${isEmpty}`));
  console.log(chalk.green('  ✅ Empty check completed\n'));

  // Test 4: Clear seed data (only if not empty)
  if (!isEmpty) {
    console.log(chalk.gray('Test 4: Clear seed data'));
    const clearResult = await clearSeed();
    if (clearResult.success) {
      console.log(chalk.green('  ✅ Seed data cleared successfully\n'));
    } else {
      console.log(chalk.red(`  ❌ Failed to clear seed data: ${clearResult.message}\n`));
    }
  } else {
    console.log(chalk.gray('Test 4: Skipped (database already empty)\n'));
  }

  // Test 5: Verify database is now empty
  console.log(chalk.gray('Test 5: Verify database is empty after clear'));
  const isEmptyAfterClear = await isDatabaseEmpty();
  if (isEmptyAfterClear) {
    console.log(chalk.green('  ✅ Database is empty\n'));
  } else {
    console.log(chalk.red('  ❌ Database is not empty\n'));
  }

  // Test 6: Regenerate seed data with custom options
  console.log(chalk.gray('Test 6: Regenerate seed data with custom options'));
  const seedResult = await regenerateSeed({
    partnersCount: 1,
    usersPerPartner: 5,
    accountsPerUser: 2,
    transactionsPerAccount: 50,
  });
  if (seedResult.success) {
    console.log(chalk.green('  ✅ Seed data regenerated successfully'));
    console.log(chalk.gray(`  Stats: ${JSON.stringify(seedResult.stats, null, 2)}\n`));
  } else {
    console.log(chalk.red(`  ❌ Failed to regenerate seed data: ${seedResult.message}\n`));
  }

  // Test 7: Verify database has data after regeneration
  console.log(chalk.gray('Test 7: Verify database has data after regeneration'));
  const statsAfterSeed = await getDatabaseStats();
  if (statsAfterSeed.partners > 0 && statsAfterSeed.users > 0) {
    console.log(chalk.green('  ✅ Database has data'));
    console.log(chalk.gray(`  Partners: ${statsAfterSeed.partners}`));
    console.log(chalk.gray(`  Users: ${statsAfterSeed.users}`));
    console.log(chalk.gray(`  Accounts: ${statsAfterSeed.accounts}`));
    console.log(chalk.gray(`  Transactions: ${statsAfterSeed.transactions}\n`));
  } else {
    console.log(chalk.red('  ❌ Database is still empty\n'));
  }

  console.log(chalk.blue.bold('🎉 Database manager tests completed!\n'));
}

// Run tests
testDatabaseManager().catch(error => {
  console.error(chalk.red(`\n❌ Test failed: ${error.message}\n`));
  console.error(error.stack);
  process.exit(1);
});
