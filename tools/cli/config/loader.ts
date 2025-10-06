import * as fs from 'fs/promises';
import { DEFAULT_CONFIG, CONFIG_FILE_PATH, CLIConfig } from './defaults';
import chalk from 'chalk';

/**
 * Configuration Loader
 * Manages reading, writing, and validating CLI configuration
 */

/**
 * Load configuration from file, falling back to defaults
 */
export async function loadConfig(): Promise<CLIConfig> {
  try {
    const fileContent = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const userConfig = JSON.parse(fileContent);

    // Merge user config with defaults to handle new fields
    const config = mergeWithDefaults(userConfig);

    // Validate the merged config
    const validation = validateConfig(config);
    if (!validation.valid) {
      console.log(chalk.yellow(`\n⚠️  Configuration validation warnings:`));
      validation.errors.forEach(error => console.log(chalk.yellow(`   • ${error}`)));
      console.log(chalk.gray(`   Using defaults for invalid fields\n`));
      return DEFAULT_CONFIG;
    }

    return config;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Config file doesn't exist, use defaults
      return DEFAULT_CONFIG;
    }

    console.log(chalk.red(`\n❌ Error loading configuration: ${error.message}`));
    console.log(chalk.gray(`   Using default configuration\n`));
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: CLIConfig): Promise<boolean> {
  try {
    const validation = validateConfig(config);
    if (!validation.valid) {
      console.log(chalk.red(`\n❌ Cannot save invalid configuration:`));
      validation.errors.forEach(error => console.log(chalk.red(`   • ${error}`)));
      return false;
    }

    await fs.writeFile(
      CONFIG_FILE_PATH,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    return true;
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error saving configuration: ${error.message}\n`));
    return false;
  }
}

/**
 * Reset configuration to defaults
 */
export async function resetConfig(): Promise<boolean> {
  try {
    await fs.unlink(CONFIG_FILE_PATH);
    console.log(chalk.green(`\n✅ Configuration reset to defaults\n`));
    return true;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, already reset
      return true;
    }
    console.log(chalk.red(`\n❌ Error resetting configuration: ${error.message}\n`));
    return false;
  }
}

/**
 * Check if configuration file exists
 */
export async function configExists(): Promise<boolean> {
  try {
    await fs.access(CONFIG_FILE_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Merge user configuration with defaults
 * Ensures all required fields exist
 */
function mergeWithDefaults(userConfig: any): CLIConfig {
  return {
    paths: {
      backend: userConfig.paths?.backend ?? DEFAULT_CONFIG.paths.backend,
      responsiveTiles: userConfig.paths?.responsiveTiles ?? DEFAULT_CONFIG.paths.responsiveTiles,
    },
    database: {
      name: userConfig.database?.name ?? DEFAULT_CONFIG.database.name,
      seedDefaults: {
        partnersCount: userConfig.database?.seedDefaults?.partnersCount ?? DEFAULT_CONFIG.database.seedDefaults.partnersCount,
        usersPerPartner: userConfig.database?.seedDefaults?.usersPerPartner ?? DEFAULT_CONFIG.database.seedDefaults.usersPerPartner,
        accountsPerUser: userConfig.database?.seedDefaults?.accountsPerUser ?? DEFAULT_CONFIG.database.seedDefaults.accountsPerUser,
        transactionsPerAccount: userConfig.database?.seedDefaults?.transactionsPerAccount ?? DEFAULT_CONFIG.database.seedDefaults.transactionsPerAccount,
      },
    },
    server: {
      backendPort: userConfig.server?.backendPort ?? DEFAULT_CONFIG.server.backendPort,
      responsiveTilesPort: userConfig.server?.responsiveTilesPort ?? DEFAULT_CONFIG.server.responsiveTilesPort,
      domain: userConfig.server?.domain ?? DEFAULT_CONFIG.server.domain,
    },
    workflow: {
      autoRestartOnFailure: userConfig.workflow?.autoRestartOnFailure ?? DEFAULT_CONFIG.workflow.autoRestartOnFailure,
      confirmDestructiveActions: userConfig.workflow?.confirmDestructiveActions ?? DEFAULT_CONFIG.workflow.confirmDestructiveActions,
      defaultWorkflow: userConfig.workflow?.defaultWorkflow ?? DEFAULT_CONFIG.workflow.defaultWorkflow,
    },
  };
}

/**
 * Validate configuration structure and values
 */
function validateConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate paths exist
  if (!config.paths?.backend) {
    errors.push('Missing paths.backend');
  }
  if (!config.paths?.responsiveTiles) {
    errors.push('Missing paths.responsiveTiles');
  }

  // Validate database config
  if (!config.database?.name) {
    errors.push('Missing database.name');
  }

  // Validate seed defaults are positive numbers
  const seedDefaults = config.database?.seedDefaults;
  if (seedDefaults) {
    if (typeof seedDefaults.partnersCount !== 'number' || seedDefaults.partnersCount < 1) {
      errors.push('database.seedDefaults.partnersCount must be >= 1');
    }
    if (typeof seedDefaults.usersPerPartner !== 'number' || seedDefaults.usersPerPartner < 1) {
      errors.push('database.seedDefaults.usersPerPartner must be >= 1');
    }
    if (typeof seedDefaults.accountsPerUser !== 'number' || seedDefaults.accountsPerUser < 1) {
      errors.push('database.seedDefaults.accountsPerUser must be >= 1');
    }
    if (typeof seedDefaults.transactionsPerAccount !== 'number' || seedDefaults.transactionsPerAccount < 1) {
      errors.push('database.seedDefaults.transactionsPerAccount must be >= 1');
    }
  }

  // Validate server ports
  if (typeof config.server?.backendPort !== 'number' || config.server.backendPort < 1 || config.server.backendPort > 65535) {
    errors.push('server.backendPort must be between 1 and 65535');
  }
  if (typeof config.server?.responsiveTilesPort !== 'number' || config.server.responsiveTilesPort < 1 || config.server.responsiveTilesPort > 65535) {
    errors.push('server.responsiveTilesPort must be between 1 and 65535');
  }

  // Validate domain
  if (!config.server?.domain || typeof config.server.domain !== 'string') {
    errors.push('Missing or invalid server.domain');
  }

  // Validate workflow settings
  if (typeof config.workflow?.autoRestartOnFailure !== 'boolean') {
    errors.push('workflow.autoRestartOnFailure must be boolean');
  }
  if (typeof config.workflow?.confirmDestructiveActions !== 'boolean') {
    errors.push('workflow.confirmDestructiveActions must be boolean');
  }
  if (config.workflow?.defaultWorkflow !== 'quick' && config.workflow?.defaultWorkflow !== 'step-by-step') {
    errors.push('workflow.defaultWorkflow must be "quick" or "step-by-step"');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Display current configuration
 */
export function displayConfig(config: CLIConfig): void {
  console.log(chalk.blue.bold('\n📋 Current Configuration\n'));

  console.log(chalk.gray('Paths:'));
  console.log(chalk.gray(`  Backend: ${config.paths.backend}`));
  console.log(chalk.gray(`  Responsive Tiles: ${config.paths.responsiveTiles}\n`));

  console.log(chalk.gray('Database:'));
  console.log(chalk.gray(`  Name: ${config.database.name}`));
  console.log(chalk.gray(`  Partners: ${config.database.seedDefaults.partnersCount}`));
  console.log(chalk.gray(`  Users per Partner: ${config.database.seedDefaults.usersPerPartner}`));
  console.log(chalk.gray(`  Accounts per User: ${config.database.seedDefaults.accountsPerUser}`));
  console.log(chalk.gray(`  Transactions per Account: ${config.database.seedDefaults.transactionsPerAccount}\n`));

  console.log(chalk.gray('Server:'));
  console.log(chalk.gray(`  Backend Port: ${config.server.backendPort}`));
  console.log(chalk.gray(`  Frontend Port: ${config.server.responsiveTilesPort}`));
  console.log(chalk.gray(`  Domain: ${config.server.domain}\n`));

  console.log(chalk.gray('Workflow:'));
  console.log(chalk.gray(`  Auto-restart on Failure: ${config.workflow.autoRestartOnFailure}`));
  console.log(chalk.gray(`  Confirm Destructive Actions: ${config.workflow.confirmDestructiveActions}`));
  console.log(chalk.gray(`  Default Workflow: ${config.workflow.defaultWorkflow}\n`));
}
