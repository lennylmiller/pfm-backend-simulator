# CLI Workflow Automation System - Design Specification

## Executive Summary

This document specifies an integrated CLI workflow system that automates the complete development environment setup for pfm-backend-simulator and responsive-tiles integration. This addresses root cause issues identified in the current manual setup process: JWT secret mismatches, partner/user ID inconsistencies, and configuration errors.

## Problem Analysis

### Current Issues
1. **JWT Secret Mismatch**: Frontend and backend use different secrets leading to 401 authentication errors
2. **Partner ID Mismatch**: JWT contains wrong partner ID (defaulting to '1' instead of actual seeded value '303')
3. **Manual Configuration Errors**: Multiple .env files requiring manual synchronization
4. **Stale Seed Data**: Developers working with outdated or incomplete test data
5. **Complex Startup Sequence**: 5+ manual steps with error-prone environment variable copying

### Root Cause
Manual coordination between two codebases (pfm-backend-simulator and responsive-tiles) with multiple configuration touch points creates opportunities for mismatch and developer friction.

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Workflow Orchestrator                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Workflow Menu System                         │  │
│  │  - Quick Start (automated full flow)                 │  │
│  │  - Step-by-Step (guided manual control)              │  │
│  │  - Configuration Management                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│  ┌───────────────────────┼────────────────────────────┐    │
│  │                       ▼                            │    │
│  │     Backend Orchestration    │  Frontend Control  │    │
│  │  ┌─────────────────────┐    │  ┌───────────────┐ │    │
│  │  │ Database Operations │    │  │ RT Process    │ │    │
│  │  │ - Clear seed data   │    │  │   Manager     │ │    │
│  │  │ - Regenerate seed   │    │  │ - Start       │ │    │
│  │  │ - Verify integrity  │    │  │ - Stop        │ │    │
│  │  └─────────────────────┘    │  │ - Restart     │ │    │
│  │                              │  └───────────────┘ │    │
│  │  ┌─────────────────────┐    │                    │    │
│  │  │ Server Management   │    │  ┌───────────────┐ │    │
│  │  │ - Start/Stop/Restart│    │  │ Config Sync   │ │    │
│  │  │ - Health checks     │    │  │ - .env mgmt   │ │    │
│  │  │ - Port detection    │    │  │ - Secret gen  │ │    │
│  │  └─────────────────────┘    │  │ - Validation  │ │    │
│  │                              │  └───────────────┘ │    │
│  └──────────────────────────────────────────────────┘    │
│                          │                                  │
│  ┌───────────────────────┼────────────────────────────┐    │
│  │                       ▼                            │    │
│  │         User/Partner Selection System              │    │
│  │  - Interactive picker                              │    │
│  │  - Database query integration                      │    │
│  │  - Validation against seed data                    │    │
│  │  - JWT generation with selected context            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Configuration Management                     │  │
│  │  - ~/.pfm-cli-config.json                           │  │
│  │  - Path settings (RT location, backend location)    │  │
│  │  - Default preferences                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Component Specifications

### 1. Configuration System

**File**: `~/.pfm-cli-config.json`

```typescript
interface CLIConfig {
  paths: {
    backend: string;                    // /Users/LenMiller/code/pfm-backend-simulator
    responsiveTiles: string;            // /Users/LenMiller/code/banno/responsive-tiles
  };
  database: {
    name: string;                       // pfm_simulator
    seedDefaults: {
      partnersCount: number;            // 1
      usersPerPartner: number;          // 10
      accountsPerUser: number;          // 3
      transactionsPerAccount: number;   // 100
    };
  };
  server: {
    backendPort: number;                // 3000
    responsiveTilesPort: number;        // 8080
    domain: string;                     // pfm.backend.simulator.com
  };
  workflow: {
    autoRestartOnFailure: boolean;
    confirmDestructiveActions: boolean;
    defaultWorkflow: 'quick' | 'step-by-step';
  };
}
```

**Storage Location**: `~/.pfm-cli-config.json`

**Management**:
- CLI command to initialize: Settings menu → "Initialize configuration"
- CLI command to edit: Settings menu → "Edit configuration"
- Auto-create with defaults on first run
- Validation on load with helpful error messages

### 2. Workflow Orchestration Menu

**Menu Structure**:

```
┌────────────────────────────────────────────────────┐
│      PFM Development Environment Manager          │
├────────────────────────────────────────────────────┤
│                                                    │
│  🚀 Quick Start (Automated Full Flow)             │
│     → Clear & reseed → Restart backend →          │
│       Select user/partner → Start RT              │
│                                                    │
│  📋 Step-by-Step Workflow                         │
│     1. Database Management                        │
│     2. Backend Management                         │
│     3. User/Partner Selection                     │
│     4. Responsive Tiles Management                │
│                                                    │
│  ⚙️  Configuration                                 │
│     → Paths & Settings                            │
│     → View Current Config                         │
│     → Reset to Defaults                           │
│                                                    │
│  ℹ️  Status Dashboard                             │
│     → Backend Status                              │
│     → Database Status                             │
│     → RT Status                                   │
│     → Current Environment                         │
│                                                    │
│  ❌ Exit                                           │
└────────────────────────────────────────────────────┘
```

### 3. Database Management Component

**File**: `tools/cli/modules/databaseManager.ts`

```typescript
interface DatabaseManager {
  // Seed operations
  clearSeedData(): Promise<ClearResult>;
  regenerateSeedData(options?: SeedOptions): Promise<SeedResult>;
  verifySeedIntegrity(): Promise<IntegrityReport>;

  // Query operations
  listPartners(): Promise<Partner[]>;
  listUsers(partnerId?: bigint): Promise<User[]>;
  getUserAccounts(userId: bigint): Promise<Account[]>;

  // Status operations
  getConnectionStatus(): Promise<ConnectionStatus>;
  getDatabaseStats(): Promise<DatabaseStats>;
}

interface SeedOptions {
  partnersCount?: number;
  usersPerPartner?: number;
  accountsPerUser?: number;
  transactionsPerAccount?: number;
  budgetsPerUser?: number;
  goalsPerUser?: number;
  clearFirst?: boolean;
}

interface SeedResult {
  success: boolean;
  stats: {
    partners: number;
    users: number;
    accounts: number;
    transactions: number;
    budgets: number;
    goals: number;
    cashflowBills: number;
    cashflowIncomes: number;
    cashflowEvents: number;
  };
  duration: number; // milliseconds
  errors?: string[];
}

interface IntegrityReport {
  valid: boolean;
  issues: {
    orphanedRecords?: string[];
    missingReferences?: string[];
    invalidData?: string[];
  };
  recommendations: string[];
}
```

**Operations**:

1. **Clear Seed Data**
   ```typescript
   async clearSeedData(): Promise<ClearResult> {
     // 1. Confirm with user (if config.workflow.confirmDestructiveActions)
     // 2. Delete in dependency order:
     //    - cashflow_events → cashflow_bills/incomes
     //    - transactions → accounts → users → partners
     //    - budgets, goals, alerts, notifications, tags
     // 3. Reset auto-increment sequences
     // 4. Return summary of deleted records
   }
   ```

2. **Regenerate Seed Data**
   ```typescript
   async regenerateSeedData(options?: SeedOptions): Promise<SeedResult> {
     // 1. Clear existing data (if options.clearFirst)
     // 2. Call existing seed generators with options
     // 3. Verify data integrity
     // 4. Return detailed stats
   }
   ```

3. **Verify Seed Integrity**
   ```typescript
   async verifySeedIntegrity(): Promise<IntegrityReport> {
     // Check for:
     // - Orphaned records (e.g., accounts without users)
     // - Missing required references
     // - Invalid data (e.g., negative balances where not allowed)
     // - Constraint violations
   }
   ```

### 4. Backend Server Management Component

**File**: `tools/cli/modules/backendManager.ts`

```typescript
interface BackendManager {
  // Process management
  start(options?: StartOptions): Promise<ProcessResult>;
  stop(): Promise<ProcessResult>;
  restart(): Promise<ProcessResult>;
  getStatus(): Promise<ServerStatus>;

  // Configuration management
  updateEnv(updates: EnvUpdates): Promise<void>;
  generateJWTSecret(): string;

  // Health checks
  waitForHealthy(timeout?: number): Promise<boolean>;
  checkPort(port: number): Promise<boolean>;
}

interface StartOptions {
  port?: number;
  env?: 'development' | 'production';
  background?: boolean;
}

interface ServerStatus {
  running: boolean;
  port?: number;
  pid?: number;
  uptime?: number;
  healthy?: boolean;
  version?: string;
}

interface EnvUpdates {
  JWT_SECRET?: string;
  PORT?: number;
  [key: string]: string | number | undefined;
}
```

**Operations**:

1. **Start Backend**
   ```typescript
   async start(options?: StartOptions): Promise<ProcessResult> {
     // 1. Check if already running (via port check)
     // 2. Validate .env configuration
     // 3. Start process: npm run dev (background)
     // 4. Wait for health endpoint (max 30s)
     // 5. Return process details
   }
   ```

2. **Stop Backend**
   ```typescript
   async stop(): Promise<ProcessResult> {
     // 1. Find process by port (lsof)
     // 2. Send SIGTERM
     // 3. Wait for graceful shutdown (max 10s)
     // 4. SIGKILL if necessary
     // 5. Verify port released
   }
   ```

3. **Health Check**
   ```typescript
   async waitForHealthy(timeout = 30000): Promise<boolean> {
     // Poll http://pfm.backend.simulator.com:3000/health
     // Retry every 1s until timeout
     // Return true if {"status":"ok"}
   }
   ```

### 5. User/Partner Selection System

**File**: `tools/cli/modules/userSelector.ts`

```typescript
interface UserSelector {
  // Interactive selection
  selectPartner(): Promise<Partner>;
  selectUser(partnerId?: bigint): Promise<User>;
  selectContext(): Promise<UserContext>;

  // Validation
  validateUserExists(userId: bigint, partnerId: bigint): Promise<boolean>;
  getUserWithAccounts(userId: bigint): Promise<UserWithAccounts>;
}

interface UserContext {
  userId: bigint;
  partnerId: bigint;
  email: string;
  accountCount: number;
  transactionCount: number;
}

interface UserWithAccounts {
  user: User;
  accounts: Account[];
  stats: {
    totalBalance: number;
    accountTypes: string[];
  };
}
```

**Selection Flow**:

```
┌─────────────────────────────────────────┐
│ Step 1: Select Partner                  │
├─────────────────────────────────────────┤
│ Available Partners:                     │
│ ○ 1. Partner 303 - Banno                │
│ ○ 2. Partner 304 - Credit Union         │
│ ○ 3. Partner 305 - Community Bank       │
└─────────────────────────────────────────┘
          ↓ (user selects 1)
┌─────────────────────────────────────────┐
│ Step 2: Select User                     │
├─────────────────────────────────────────┤
│ Users for Partner 303:                  │
│ ○ 426 - Lincoln47@hotmail.com (3 accts) │
│ ○ 427 - Sarah12@gmail.com (2 accts)     │
│ ○ 428 - John99@yahoo.com (4 accts)      │
└─────────────────────────────────────────┘
          ↓ (user selects 426)
┌─────────────────────────────────────────┐
│ Confirmation                            │
├─────────────────────────────────────────┤
│ Selected Context:                       │
│   User: 426 (Lincoln47@hotmail.com)     │
│   Partner: 303 (Banno)                  │
│   Accounts: 3                           │
│   Transactions: 150                     │
│                                         │
│ Continue? (Y/n)                         │
└─────────────────────────────────────────┘
```

### 6. Responsive Tiles Manager

**File**: `tools/cli/modules/responsiveTilesManager.ts`

```typescript
interface ResponsiveTilesManager {
  // Process management
  start(context: UserContext, secret: string): Promise<ProcessResult>;
  stop(): Promise<ProcessResult>;
  restart(context: UserContext, secret: string): Promise<ProcessResult>;
  getStatus(): Promise<RTStatus>;

  // Configuration management
  updateEnv(context: UserContext, secret: string): Promise<void>;
  generateStartCommand(context: UserContext, secret: string): string;

  // Health checks
  waitForReady(timeout?: number): Promise<boolean>;
  checkPort(port: number): Promise<boolean>;
}

interface RTStatus {
  running: boolean;
  port?: number;
  pid?: number;
  buildComplete?: boolean;
  accessibleAt?: string;
}
```

**Operations**:

1. **Generate Start Command**
   ```typescript
   generateStartCommand(context: UserContext, secret: string): string {
     // Returns:
     // API_KEY=<secret> PARTNER_DOMAIN='pfm.backend.simulator.com'
     // PCID=<context.userId> ENV=development npm start
   }
   ```

2. **Start Responsive Tiles**
   ```typescript
   async start(context: UserContext, secret: string): Promise<ProcessResult> {
     // 1. Check if already running
     // 2. Update .env file (or skip if using inline env vars)
     // 3. cd to RT directory
     // 4. Execute start command with env vars
     // 5. Monitor webpack build output
     // 6. Wait for "Compiled successfully" message
     // 7. Return process details and URL
   }
   ```

3. **Health Check**
   ```typescript
   async waitForReady(timeout = 120000): Promise<boolean> {
     // Watch for webpack compilation success
     // Poll http://localhost:8080
     // Return true when accessible
   }
   ```

### 7. Quick Start Workflow

**File**: `tools/cli/workflows/quickStart.ts`

```typescript
async function quickStartWorkflow(config: CLIConfig): Promise<WorkflowResult> {
  const workflow = [
    // Step 1: Database Setup
    {
      name: 'Clear existing seed data',
      action: () => databaseManager.clearSeedData(),
      skipIf: () => !config.workflow.confirmDestructiveActions,
    },
    {
      name: 'Regenerate seed data',
      action: () => databaseManager.regenerateSeedData(config.database.seedDefaults),
    },
    {
      name: 'Verify data integrity',
      action: () => databaseManager.verifySeedIntegrity(),
    },

    // Step 2: Backend Setup
    {
      name: 'Generate JWT secret',
      action: () => backendManager.generateJWTSecret(),
      storeAs: 'jwtSecret',
    },
    {
      name: 'Update backend .env',
      action: (secret) => backendManager.updateEnv({ JWT_SECRET: secret }),
      usesResult: 'jwtSecret',
    },
    {
      name: 'Restart backend server',
      action: () => backendManager.restart(),
    },
    {
      name: 'Wait for backend healthy',
      action: () => backendManager.waitForHealthy(),
    },

    // Step 3: User Selection
    {
      name: 'Select partner and user',
      action: () => userSelector.selectContext(),
      storeAs: 'userContext',
    },

    // Step 4: Frontend Setup
    {
      name: 'Stop existing RT instance',
      action: () => responsiveTilesManager.stop(),
      ignoreFailure: true,
    },
    {
      name: 'Start Responsive Tiles',
      action: (secret, context) =>
        responsiveTilesManager.start(context, secret),
      usesResults: ['jwtSecret', 'userContext'],
    },
    {
      name: 'Wait for webpack build',
      action: () => responsiveTilesManager.waitForReady(),
    },
  ];

  return executeWorkflow(workflow);
}
```

**Progress Display**:

```
🚀 Quick Start Workflow

[✓] Clear existing seed data (1.2s)
[✓] Regenerate seed data (3.5s)
    → Created 1 partner, 10 users, 30 accounts
[✓] Verify data integrity (0.8s)
[✓] Generate JWT secret (0.1s)
[✓] Update backend .env (0.2s)
[⟳] Restart backend server...
[✓] Restart backend server (2.1s)
[⟳] Wait for backend healthy...
[✓] Wait for backend healthy (1.5s)

📋 Select Partner and User:
[User selection UI appears...]

[✓] Stop existing RT instance (0.3s)
[⟳] Start Responsive Tiles...
[✓] Start Responsive Tiles (15.2s)
[⟳] Wait for webpack build...
[✓] Wait for webpack build (45.8s)

✅ Environment Ready!

Backend:     http://pfm.backend.simulator.com:3000
Frontend:    http://localhost:8080
User:        426 (Lincoln47@hotmail.com)
Partner:     303
```

### 8. Step-by-Step Workflow

**Menu Structure**:

```
┌────────────────────────────────────────────────────┐
│      Step-by-Step Workflow                        │
├────────────────────────────────────────────────────┤
│                                                    │
│  1. 💾 Database Management                         │
│     ○ Clear seed data                             │
│     ○ Regenerate seed data                        │
│     ○ Verify integrity                            │
│     ○ View statistics                             │
│                                                    │
│  2. 🖥️  Backend Management                         │
│     ○ Start server                                │
│     ○ Stop server                                 │
│     ○ Restart server                              │
│     ○ View status                                 │
│     ○ Update configuration                        │
│                                                    │
│  3. 👤 User/Partner Selection                      │
│     ○ Select partner                              │
│     ○ Select user                                 │
│     ○ View current selection                      │
│                                                    │
│  4. 🎨 Responsive Tiles Management                 │
│     ○ Start RT                                    │
│     ○ Stop RT                                     │
│     ○ Restart RT                                  │
│     ○ View status                                 │
│     ○ Generate startup command                    │
│                                                    │
│  ⬅️  Back to Main Menu                             │
└────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Configuration & Infrastructure (2-3 hours)

**Files to Create**:
1. `tools/cli/config/defaults.ts` - Default configuration
2. `tools/cli/config/loader.ts` - Config file management
3. `tools/cli/types/workflow.ts` - TypeScript interfaces

**Tasks**:
- [ ] Define configuration schema
- [ ] Implement config file reader/writer
- [ ] Create initialization logic
- [ ] Add validation

### Phase 2: Database Management Module (3-4 hours)

**Files to Create**:
1. `tools/cli/modules/databaseManager.ts`

**Tasks**:
- [ ] Implement clearSeedData()
- [ ] Implement regenerateSeedData()
- [ ] Implement verifySeedIntegrity()
- [ ] Implement query methods (listPartners, listUsers)
- [ ] Add progress indicators
- [ ] Add error handling

### Phase 3: Backend Management Module (2-3 hours)

**Files to Create**:
1. `tools/cli/modules/backendManager.ts`

**Tasks**:
- [ ] Implement start/stop/restart methods
- [ ] Implement health check logic
- [ ] Implement .env file updates
- [ ] Add process management (PID tracking)
- [ ] Add port detection

### Phase 4: User Selection Module (2-3 hours)

**Files to Create**:
1. `tools/cli/modules/userSelector.ts`

**Tasks**:
- [ ] Implement interactive partner selection
- [ ] Implement interactive user selection
- [ ] Add account/transaction count display
- [ ] Add validation logic
- [ ] Add confirmation step

### Phase 5: Responsive Tiles Manager (3-4 hours)

**Files to Create**:
1. `tools/cli/modules/responsiveTilesManager.ts`

**Tasks**:
- [ ] Implement start/stop/restart methods
- [ ] Implement command generation
- [ ] Add webpack build monitoring
- [ ] Add health check logic
- [ ] Add .env file updates (optional)

### Phase 6: Workflow Orchestration (4-5 hours)

**Files to Create**:
1. `tools/cli/workflows/quickStart.ts`
2. `tools/cli/workflows/stepByStep.ts`
3. `tools/cli/workflows/executor.ts` - Workflow runner

**Tasks**:
- [ ] Implement workflow execution engine
- [ ] Implement Quick Start workflow
- [ ] Implement Step-by-Step menus
- [ ] Add progress tracking and display
- [ ] Add error recovery mechanisms
- [ ] Add rollback capabilities

### Phase 7: Main Menu Integration (2-3 hours)

**Files to Modify**:
1. `tools/cli/index.ts`

**Tasks**:
- [ ] Add new main menu options
- [ ] Integrate workflow modules
- [ ] Add status dashboard
- [ ] Update existing features to use new modules
- [ ] Add configuration menu

### Phase 8: Testing & Documentation (3-4 hours)

**Tasks**:
- [ ] Test Quick Start workflow end-to-end
- [ ] Test Step-by-Step workflow
- [ ] Test error scenarios
- [ ] Test configuration management
- [ ] Update CLI README
- [ ] Create workflow documentation
- [ ] Add inline code comments

## Data Flow

### Quick Start Workflow Data Flow

```
User initiates Quick Start
         ↓
Load Config (~/.pfm-cli-config.json)
         ↓
Clear Seed Data
         ↓
Regenerate Seed Data
    → Store stats
         ↓
Generate JWT Secret (crypto.randomBytes)
    → Store secret
         ↓
Update Backend .env
    → Write JWT_SECRET
         ↓
Restart Backend
    → Kill existing process
    → Start new process
    → Wait for health check
         ↓
Query Database
    → Get partners list
         ↓
User Selects Partner
    → Store partnerId
         ↓
Query Database
    → Get users for partner
         ↓
User Selects User
    → Store userId, email
    → Query account count
         ↓
Generate RT Start Command
    → Use secret + userId + partnerId
         ↓
Stop Existing RT
    → Kill webpack process
         ↓
Start RT with Command
    → Execute in background
    → Monitor webpack output
         ↓
Wait for Build Complete
         ↓
Display Success + URLs
```

## Error Handling Strategy

### Error Categories

1. **Configuration Errors**
   - Missing config file → Create with defaults
   - Invalid paths → Prompt user to update
   - Missing dependencies → Display helpful message

2. **Database Errors**
   - Connection failure → Check PostgreSQL running
   - Seed failure → Rollback transaction
   - Integrity issues → Display report, offer fix

3. **Process Errors**
   - Port already in use → Offer to kill existing
   - Process won't start → Display logs
   - Timeout → Increase timeout, retry

4. **Workflow Errors**
   - Step failure → Halt workflow, display error
   - User cancellation → Cleanup, safe exit
   - Dependency failure → Skip dependent steps

### Recovery Mechanisms

```typescript
interface WorkflowStep {
  name: string;
  action: () => Promise<any>;
  onError?: (error: Error) => Promise<'retry' | 'skip' | 'abort'>;
  rollback?: () => Promise<void>;
  maxRetries?: number;
}
```

## Configuration File Examples

### Default Configuration

```json
{
  "paths": {
    "backend": "/Users/LenMiller/code/pfm-backend-simulator",
    "responsiveTiles": "/Users/LenMiller/code/banno/responsive-tiles"
  },
  "database": {
    "name": "pfm_simulator",
    "seedDefaults": {
      "partnersCount": 1,
      "usersPerPartner": 10,
      "accountsPerUser": 3,
      "transactionsPerAccount": 100
    }
  },
  "server": {
    "backendPort": 3000,
    "responsiveTilesPort": 8080,
    "domain": "pfm.backend.simulator.com"
  },
  "workflow": {
    "autoRestartOnFailure": false,
    "confirmDestructiveActions": true,
    "defaultWorkflow": "step-by-step"
  }
}
```

## Security Considerations

1. **JWT Secret Generation**: Use crypto.randomBytes(64) for secrets
2. **File Permissions**: Config file should be readable only by user (chmod 600)
3. **Process Isolation**: Run processes with minimum required privileges
4. **Validation**: Sanitize all user inputs before using in shell commands
5. **Audit Trail**: Log all destructive operations to ~/.pfm-cli-audit.log

## Performance Considerations

1. **Parallel Operations**: Run independent steps concurrently where possible
2. **Caching**: Cache database queries during workflow execution
3. **Lazy Loading**: Load modules only when needed
4. **Process Monitoring**: Use efficient polling intervals (1s for health checks)
5. **Timeout Management**: Reasonable defaults with user override options

## Testing Strategy

### Unit Tests
- Configuration loader/validator
- Database manager methods
- Backend/RT process management
- User selection logic

### Integration Tests
- Full Quick Start workflow
- Step-by-Step workflow paths
- Error recovery scenarios
- Configuration updates

### Manual Testing Checklist
- [ ] Fresh install (no config file)
- [ ] Existing config file
- [ ] Backend already running
- [ ] RT already running
- [ ] Database connection failure
- [ ] Port conflicts
- [ ] User cancellation at each step
- [ ] Invalid user/partner selection

## Success Metrics

1. **Time to Environment Ready**: < 2 minutes (automated)
2. **Error Rate**: < 5% in normal operation
3. **User Steps Required**: 0 for Quick Start, ~5 for Step-by-Step
4. **Configuration Errors**: 0 (automated sync)
5. **Developer Satisfaction**: Reduction in setup frustration

## Migration Path

1. **Phase 1**: Add new workflow features alongside existing CLI
2. **Phase 2**: Update documentation to recommend new workflows
3. **Phase 3**: Deprecate manual steps documentation
4. **Phase 4**: Remove old manual commands (optional)

## Maintenance Plan

1. **Configuration Updates**: Version config schema, auto-migrate
2. **Dependency Updates**: Test with new npm package versions
3. **Path Changes**: Support both absolute and relative paths
4. **Database Schema Changes**: Auto-detect and warn users
5. **Documentation**: Keep workflow docs in sync with code

---

## Implementation Checklist

**Total Estimated Time**: 22-30 hours

- [ ] Phase 1: Configuration & Infrastructure (2-3h)
- [ ] Phase 2: Database Management (3-4h)
- [ ] Phase 3: Backend Management (2-3h)
- [ ] Phase 4: User Selection (2-3h)
- [ ] Phase 5: RT Manager (3-4h)
- [ ] Phase 6: Workflow Orchestration (4-5h)
- [ ] Phase 7: Main Menu Integration (2-3h)
- [ ] Phase 8: Testing & Documentation (3-4h)

**Priority**: High - Eliminates major pain point in development workflow

**Risk**: Low - Additive feature, doesn't break existing functionality

**Dependencies**: None - Uses existing CLI infrastructure

## File Structure

```
pfm-backend-simulator/
├── docs/
│   └── CLI_WORKFLOW_AUTOMATION.md          # This specification
├── tools/
│   └── cli/
│       ├── config/
│       │   ├── defaults.ts                  # Default configuration values
│       │   └── loader.ts                    # Config file management
│       ├── modules/
│       │   ├── databaseManager.ts           # Database operations
│       │   ├── backendManager.ts            # Backend server management
│       │   ├── userSelector.ts              # User/partner selection
│       │   └── responsiveTilesManager.ts    # RT process management
│       ├── workflows/
│       │   ├── executor.ts                  # Workflow execution engine
│       │   ├── quickStart.ts                # Automated workflow
│       │   └── stepByStep.ts                # Manual workflow menus
│       ├── types/
│       │   └── workflow.ts                  # TypeScript interfaces
│       └── index.ts                         # Main CLI entry (modified)
└── ~/.pfm-cli-config.json                   # User configuration file
```
