import * as os from 'os';
import * as path from 'path';

/**
 * CLI Configuration Interface
 * Defines all configurable aspects of the CLI workflow automation system
 */
export interface CLIConfig {
  paths: {
    backend: string;                    // Path to pfm-backend-simulator
    responsiveTiles: string;            // Path to responsive-tiles frontend
  };
  database: {
    name: string;                       // Database name
    seedDefaults: {
      partnersCount: number;            // Number of partners to create
      usersPerPartner: number;          // Users per partner
      accountsPerUser: number;          // Accounts per user
      transactionsPerAccount: number;   // Transactions per account
    };
  };
  server: {
    backendPort: number;                // Backend server port
    responsiveTilesPort: number;        // Frontend dev server port
    domain: string;                     // Domain for JWT audience claim
  };
  workflow: {
    autoRestartOnFailure: boolean;      // Auto-restart on failure
    confirmDestructiveActions: boolean; // Require confirmation for destructive ops
    defaultWorkflow: 'quick' | 'step-by-step'; // Default workflow mode
  };
}

/**
 * Default CLI Configuration
 * Used when no user configuration file exists
 */
export const DEFAULT_CONFIG: CLIConfig = {
  paths: {
    backend: path.resolve(os.homedir(), 'code/pfm-backend-simulator'),
    responsiveTiles: path.resolve(os.homedir(), 'code/banno/responsive-tiles'),
  },
  database: {
    name: 'pfm_simulator',
    seedDefaults: {
      partnersCount: 1,
      usersPerPartner: 10,
      accountsPerUser: 3,
      transactionsPerAccount: 100,
    },
  },
  server: {
    backendPort: 3000,
    responsiveTilesPort: 8080,
    domain: 'pfm.backend.simulator.com',
  },
  workflow: {
    autoRestartOnFailure: false,
    confirmDestructiveActions: true,
    defaultWorkflow: 'quick',
  },
};

/**
 * Configuration file path
 * Located in user's home directory for persistence across sessions
 */
export const CONFIG_FILE_PATH = path.join(os.homedir(), '.pfm-cli-config.json');
