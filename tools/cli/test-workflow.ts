#!/usr/bin/env ts-node
/**
 * Test the Quick Start workflow modules
 */

import chalk from 'chalk';
import { loadConfig } from './config/loader';
import * as databaseManager from './modules/databaseManager';
import * as userSelector from './modules/userSelector';

async function testWorkflow() {
  console.log(chalk.blue.bold('\n🧪 Testing Workflow Components\n'));

  try {
    // Test 1: Load config
    console.log(chalk.gray('Test 1: Load configuration'));
    const config = await loadConfig();
    console.log(chalk.green(`  ✅ Config loaded: ${config.paths.backend}`));
    console.log(chalk.gray(`  Backend port: ${config.server.backendPort}`));
    console.log(chalk.gray(`  Domain: ${config.server.domain}\n`));

    // Test 2: Check database
    console.log(chalk.gray('Test 2: Check database status'));
    const stats = await databaseManager.getDatabaseStats();
    console.log(chalk.green(`  ✅ Database accessible`));
    console.log(chalk.gray(`  Partners: ${stats.partners}`));
    console.log(chalk.gray(`  Users: ${stats.users}`));
    console.log(chalk.gray(`  Accounts: ${stats.accounts}\n`));

    // Test 3: List partners
    if (stats.partners > 0) {
      console.log(chalk.gray('Test 3: List partners'));
      await userSelector.listPartners();
    }

    console.log(chalk.green.bold('\n✅ All workflow components functional!\n'));
    console.log(chalk.yellow('💡 Ready to test Quick Start workflow\n'));
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Test failed: ${error.message}\n`));
    console.error(error.stack);
    process.exit(1);
  }
}

testWorkflow();
