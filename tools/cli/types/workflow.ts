/**
 * Workflow Type Definitions
 * TypeScript interfaces for CLI workflow automation system
 */

/**
 * Database operation result
 */
export interface DatabaseOperationResult {
  success: boolean;
  message: string;
  error?: Error;
  stats?: {
    partnersCreated?: number;
    usersCreated?: number;
    accountsCreated?: number;
    transactionsCreated?: number;
    duration?: number; // milliseconds
  };
}

/**
 * Server health status
 */
export interface ServerHealth {
  healthy: boolean;
  port: number;
  url: string;
  responseTime?: number; // milliseconds
  error?: string;
}

/**
 * Process information
 */
export interface ProcessInfo {
  pid: number;
  running: boolean;
  port: number;
  startTime: Date;
}

/**
 * User/Partner selection result
 */
export interface UserPartnerSelection {
  userId: bigint;
  partnerId: bigint;
  userName?: string;
  partnerName?: string;
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  config: any; // CLIConfig from config/defaults.ts
  selectedUser?: UserPartnerSelection;
  backendProcess?: ProcessInfo;
  responsiveTilesProcess?: ProcessInfo;
  jwtSecret?: string;
}

/**
 * Workflow step status
 */
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: WorkflowStepStatus;
  execute: (context: WorkflowContext) => Promise<void>;
  rollback?: (context: WorkflowContext) => Promise<void>;
  skipIf?: (context: WorkflowContext) => boolean;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  completedSteps: string[];
  failedStep?: string;
  error?: Error;
  context: WorkflowContext;
}

/**
 * Seed configuration options
 */
export interface SeedOptions {
  partnersCount?: number;
  usersPerPartner?: number;
  accountsPerUser?: number;
  transactionsPerAccount?: number;
}
