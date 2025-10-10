# Future Features & Unimplemented Functionality
**Date**: 2025-10-09
**Purpose**: Track features described in docs but NOT yet implemented
**Status**: Planning/Future Work

---

## Not Implemented Features

### 1. Account Aggregation
**Status**: ❌ Not Implemented
**Complexity**: High (requires external integrations)
**Description**: Automatic transaction syncing via third-party providers

**Requirements**:
- Plaid integration for bank account linking
- Finicity integration support
- MX (Money Experience) integration support
- CashEdge integration support
- OAuth flow for account authorization
- Transaction harvesting background jobs
- Account credential management
- Error handling and retry logic

**Estimated Effort**: 3-4 weeks

---

### 2. Advanced Analytics & Reporting
**Status**: ❌ Not Implemented
**Complexity**: Medium
**Description**: Advanced data analytics beyond current expense reporting

**Requirements**:
- Custom report builder
- Data export in multiple formats (CSV, Excel, PDF)
- Scheduled reports
- Trend analysis with machine learning
- Spending predictions
- Financial health scoring
- Comparative analytics (month-over-month, year-over-year)

**Estimated Effort**: 2-3 weeks

---

### 3. Batch Import/Export
**Status**: ❌ Not Implemented
**Complexity**: Medium
**Description**: Bulk data operations for migration and backup

**Requirements**:
- CSV import for transactions
- QIF/OFX import support
- Bulk data export (all user data)
- Import validation and error reporting
- Duplicate detection
- Format conversion utilities

**Estimated Effort**: 1-2 weeks

---

### 4. Stub Endpoints

**GET `/users/:userId/ads`**
- **Status**: Stub (returns empty array)
- **Purpose**: Ad management for premium features
- **Effort**: 1-2 days

**POST `/users/:userId/logout`**
- **Status**: Stub (returns 204)
- **Purpose**: Session termination and token invalidation
- **Effort**: 1 day

**POST `/users/:userId/harvest`**
- **Status**: Stub (returns 204)
- **Purpose**: Manual trigger for account aggregation
- **Effort**: Depends on aggregation implementation

**GET `/assets/config/:partnerId/config.json`**
- **Status**: Minimal implementation
- **Purpose**: Partner-specific configuration for frontend
- **Effort**: 2-3 days for full feature flags

---

## Historical Features (Potentially Future)

### Balance History Tracking
**Status**: Not Implemented (mentioned in networthService.ts)
**Purpose**: Track account balance changes over time for trend analysis

**Requirements**:
- BalanceHistory table with daily snapshots
- Background job to capture daily balances
- Historical networth calculation endpoint
- Trend visualization data

**Estimated Effort**: 1 week

---

### Email/SMS Delivery
**Status**: Designed but not connected
**Purpose**: Actually send alert notifications via email/SMS

**Current State**:
- Database tracks emailSent/smsSent status
- Alert delivery preferences configured
- No actual email/SMS provider integration

**Requirements**:
- SendGrid or AWS SES integration for email
- Twilio integration for SMS
- Template management
- Delivery tracking and bounce handling

**Estimated Effort**: 1 week

---

### Background Job Processing
**Status**: Not Implemented
**Purpose**: Automated tasks like alert evaluation, cashflow projections

**Current State**:
- Alert evaluation exists but not scheduled
- Cashflow events generated on-demand only

**Requirements**:
- Bull or BullMQ for job queuing
- Scheduled job execution (cron-like)
- Job monitoring and failure handling
- Retry logic

**Estimated Effort**: 1 week

---

## Reference: Original Planning Documentation

See removed sections from:
- `/specs/fodder/DATABASE_SPEC_MIGRATION_STRATEGY.md` - Original "NEW models" content
- `/specs/fodder/COMPONENT_SPEC_TEMPLATES.md` - Implementation templates
- `/specs/fodder/API_SPEC_FUTURE_ENDPOINTS.md` - Planned but unimplemented endpoints

---

**Total Unimplemented Scope**: ~8-12 weeks of additional development for all features
