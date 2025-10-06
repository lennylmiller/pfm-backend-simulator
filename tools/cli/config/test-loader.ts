#!/usr/bin/env ts-node
/**
 * Test script for configuration loader
 * Run: npx ts-node tools/cli/config/test-loader.ts
 */

import { loadConfig, saveConfig, resetConfig, configExists, displayConfig } from './loader';
import { DEFAULT_CONFIG } from './defaults';
import chalk from 'chalk';

async function testConfigLoader() {
  console.log(chalk.blue.bold('\n🧪 Testing Configuration Loader\n'));

  // Test 1: Check if config exists
  console.log(chalk.gray('Test 1: Check config file existence'));
  const exists = await configExists();
  console.log(chalk.gray(`  Config exists: ${exists}\n`));

  // Test 2: Load config (should use defaults if not exists)
  console.log(chalk.gray('Test 2: Load configuration'));
  const config = await loadConfig();
  console.log(chalk.green('  ✅ Config loaded successfully'));
  displayConfig(config);

  // Test 3: Modify and save config
  console.log(chalk.gray('Test 3: Save modified configuration'));
  const modifiedConfig = { ...config };
  modifiedConfig.database.seedDefaults.partnersCount = 2;
  modifiedConfig.database.seedDefaults.usersPerPartner = 5;

  const saved = await saveConfig(modifiedConfig);
  if (saved) {
    console.log(chalk.green('  ✅ Config saved successfully\n'));
  } else {
    console.log(chalk.red('  ❌ Failed to save config\n'));
  }

  // Test 4: Reload and verify changes persisted
  console.log(chalk.gray('Test 4: Reload and verify changes'));
  const reloaded = await loadConfig();
  if (reloaded.database.seedDefaults.partnersCount === 2 &&
      reloaded.database.seedDefaults.usersPerPartner === 5) {
    console.log(chalk.green('  ✅ Changes persisted correctly\n'));
  } else {
    console.log(chalk.red('  ❌ Changes did not persist\n'));
  }

  // Test 5: Test validation with invalid config
  console.log(chalk.gray('Test 5: Test validation with invalid config'));
  const invalidConfig: any = { ...config };
  invalidConfig.server.backendPort = 99999; // Invalid port
  invalidConfig.database.seedDefaults.partnersCount = -1; // Invalid count

  const invalidSaved = await saveConfig(invalidConfig);
  if (!invalidSaved) {
    console.log(chalk.green('  ✅ Validation correctly rejected invalid config\n'));
  } else {
    console.log(chalk.red('  ❌ Validation failed to catch errors\n'));
  }

  // Test 6: Reset to defaults
  console.log(chalk.gray('Test 6: Reset configuration'));
  const reset = await resetConfig();
  if (reset) {
    console.log(chalk.green('  ✅ Config reset successfully\n'));
  }

  // Test 7: Verify defaults after reset
  console.log(chalk.gray('Test 7: Verify defaults after reset'));
  const afterReset = await loadConfig();
  if (JSON.stringify(afterReset) === JSON.stringify(DEFAULT_CONFIG)) {
    console.log(chalk.green('  ✅ Config matches defaults after reset\n'));
  } else {
    console.log(chalk.red('  ❌ Config does not match defaults\n'));
  }

  console.log(chalk.blue.bold('🎉 Configuration loader tests completed!\n'));
}

// Run tests
testConfigLoader().catch(error => {
  console.error(chalk.red(`\n❌ Test failed: ${error.message}\n`));
  process.exit(1);
});
