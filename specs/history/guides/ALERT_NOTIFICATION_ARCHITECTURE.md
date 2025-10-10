# Alert Notification System Architecture

**Version**: 1.0
**Date**: 2025-10-04
**Status**: Design Specification
**Project**: pfm-backend-simulator

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Components](#architecture-components)
4. [Background Job Architecture](#background-job-architecture)
5. [Alert Evaluation Strategy](#alert-evaluation-strategy)
6. [Trigger Conditions Specification](#trigger-conditions-specification)
7. [Notification Delivery Architecture](#notification-delivery-architecture)
8. [Database Schema Design](#database-schema-design)
9. [Performance Optimization](#performance-optimization)
10. [Scalability Design](#scalability-design)
11. [Reliability Patterns](#reliability-patterns)
12. [Technology Stack](#technology-stack)
13. [Implementation Roadmap](#implementation-roadmap)
14. [Operational Runbook](#operational-runbook)

---

## Executive Summary

This document specifies the comprehensive architecture for the Alert Notification System in the pfm-backend-simulator project. The system delivers real-time and scheduled financial alerts across multiple channels (email, SMS, in-app) with enterprise-grade reliability and scalability.

### Design Goals

- **Scalability**: Support 10,000+ users with millions of active alerts
- **Reliability**: 99.9% uptime, zero notification data loss
- **Performance**: <5 seconds evaluation per 1000 alerts
- **Maintainability**: Clear separation of concerns, comprehensive testing
- **Observability**: Rich metrics, structured logs, distributed tracing

### Current State

**Implemented**:
- ✅ 6 alert types (account_threshold, goal, merchant_name, spending_target, transaction_limit, upcoming_bill)
- ✅ Alert evaluation logic in `src/services/alertEvaluator.ts`
- ✅ Database schema for Alerts and Notifications
- ✅ Alert CRUD operations
- ✅ In-app notification storage

**Missing** (This Architecture):
- ❌ Background job infrastructure
- ❌ Email/SMS delivery integration
- ❌ Notification templates
- ❌ Delivery tracking and retry logic
- ❌ Monitoring and alerting
- ❌ Performance optimization
- ❌ Horizontal scaling support

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ALERT NOTIFICATION SYSTEM                        │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐          ┌──────────────────────────────────────────┐
│  Trigger Events  │          │        Background Job Scheduler           │
├──────────────────┤          ├──────────────────────────────────────────┤
│ • Transaction    │───┐      │  Bull Queue (Redis)                      │
│   Posted         │   │      │  ┌────────────────────────────────────┐  │
│ • Account        │   │      │  │ Periodic Jobs:                     │  │
│   Balance Change │   │      │  │ • Alert Evaluation (every 5 min)   │  │
│ • Goal Progress  │   │      │  │ • Bill Reminders (daily at 6am)    │  │
│ • Budget Update  │   │      │  │ • Account Sync (hourly)            │  │
│ • Manual Trigger │   │      │  └────────────────────────────────────┘  │
└──────────────────┘   │      └──────────────────────────────────────────┘
                       │                        │
                       │                        ↓
                       │      ┌──────────────────────────────────────────┐
                       └─────→│      Alert Evaluation Engine             │
                              ├──────────────────────────────────────────┤
                              │  1. Fetch Active Alerts (batched)        │
                              │  2. Fetch Context Data (accounts, etc)   │
                              │  3. Evaluate Conditions                  │
                              │  4. Check Cooldown/Deduplication         │
                              │  5. Create Notifications                 │
                              └──────────────────────────────────────────┘
                                                │
                                                ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION DELIVERY ORCHESTRATOR                     │
├───────────────────────────────────────────────────────────────────────────┤
│  • Read user delivery preferences (email/SMS/in-app)                      │
│  • Apply rate limiting and quiet hours                                    │
│  • Route to appropriate delivery channels                                 │
│  • Track delivery attempts and status                                     │
└───────────────────────────────────────────────────────────────────────────┘
         │                        │                         │
         ↓                        ↓                         ↓
┌────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  Email Channel │      │   SMS Channel   │      │  In-App Channel  │
├────────────────┤      ├─────────────────┤      ├──────────────────┤
│ • SendGrid API │      │  • Twilio API   │      │ • Database Write │
│ • Template     │      │  • Plain Text   │      │ • WebSocket Push │
│   Rendering    │      │  • 160 char max │      │ • Badge Count    │
│ • Retry Logic  │      │  • Retry Logic  │      │ • Direct Storage │
│ • Bounce Track │      │  • Cost Track   │      │ • Instant        │
└────────────────┘      └─────────────────┘      └──────────────────┘
         │                        │                         │
         └────────────────────────┴─────────────────────────┘
                                  │
                                  ↓
                    ┌──────────────────────────────┐
                    │  Delivery Tracking Storage   │
                    ├──────────────────────────────┤
                    │  NotificationDelivery Table  │
                    │  • Per-channel status        │
                    │  • Timestamps                │
                    │  • Provider IDs              │
                    │  • Error details             │
                    └──────────────────────────────┘
```

### Data Flow Sequence

```mermaid
sequenceDiagram
    participant T as Transaction API
    participant Q as Job Queue
    participant E as Evaluator
    participant N as Notifier
    participant D as Delivery
    participant U as User

    T->>Q: Enqueue alert check (transaction_id)
    Q->>E: Process job
    E->>E: Fetch alerts for user
    E->>E: Evaluate conditions
    E->>N: Create notification
    N->>N: Check rate limits
    N->>D: Deliver via channels
    D->>U: Email sent
    D->>U: SMS sent
    D->>U: In-app notification
    D->>N: Update delivery status
```

---

## Architecture Components

### 1. Background Job Scheduler

**Responsibility**: Trigger alert evaluations on schedule or event-based

**Technology**: Bull (Redis-backed job queue)

**Job Types**:

| Job Name | Trigger | Frequency | Purpose |
|----------|---------|-----------|---------|
| `alert:evaluate:periodic` | Cron | Every 5 minutes | Evaluate account_threshold, goal, spending_target |
| `alert:evaluate:bills` | Cron | Daily at 6:00 AM | Evaluate upcoming_bill alerts |
| `alert:evaluate:user` | Event | On-demand | Evaluate all alerts for specific user |
| `alert:evaluate:realtime` | Event | Immediate | Evaluate transaction_limit, merchant_name on new transaction |

**Implementation**:
```typescript
// src/jobs/alertScheduler.ts
import Bull from 'bull';
import config from '../config';

export const alertQueue = new Bull('alert-evaluation', {
  redis: config.redis.url,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

// Schedule periodic evaluation
alertQueue.add('alert:evaluate:periodic', {}, {
  repeat: { cron: '*/5 * * * *' } // Every 5 minutes
});

// Schedule bill reminders
alertQueue.add('alert:evaluate:bills', {}, {
  repeat: { cron: '0 6 * * *' } // Daily at 6 AM
});
```

### 2. Alert Evaluation Engine

**Responsibility**: Determine if alert conditions are met and trigger notifications

**Current Location**: `src/services/alertEvaluator.ts` (existing, needs enhancement)

**Enhancements Needed**:
- Batch processing support
- Cooldown/deduplication logic
- Performance optimization with caching
- Parallel evaluation for independent alerts

**Enhanced Architecture**:
```typescript
// src/services/alertEvaluator.ts (enhanced)

interface EvaluationContext {
  userId: bigint;
  partnerId: bigint;
  triggerType: 'periodic' | 'realtime' | 'manual';
  triggerData?: any;
}

class AlertEvaluationOrchestrator {
  async evaluateUserAlerts(context: EvaluationContext): Promise<EvaluationResult[]> {
    // 1. Fetch active alerts (with caching)
    const alerts = await this.fetchActiveAlerts(context.userId);

    // 2. Group alerts by type for batch context fetching
    const alertsByType = this.groupAlertsByType(alerts);

    // 3. Fetch context data in batches
    const contextData = await this.fetchContextDataBatch(alertsByType, context);

    // 4. Evaluate alerts in parallel
    const results = await this.evaluateAlertsParallel(alerts, contextData);

    // 5. Filter by cooldown/deduplication
    const filteredResults = await this.applyDeduplication(results);

    return filteredResults;
  }

  private async applyDeduplication(results: EvaluationResult[]): Promise<EvaluationResult[]> {
    // Check lastTriggeredAt and prevent re-triggering within cooldown period
    const COOLDOWN_HOURS = 6;
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

    return results.filter(result => {
      if (!result.alert.lastTriggeredAt) return true;

      const timeSinceLastTrigger = Date.now() - result.alert.lastTriggeredAt.getTime();
      return timeSinceLastTrigger >= cooldownMs;
    });
  }
}
```

### 3. Notification Delivery Orchestrator

**Responsibility**: Route notifications to appropriate channels based on user preferences

**New Component**: `src/services/notificationDelivery.ts`

**Architecture**:
```typescript
// src/services/notificationDelivery.ts

interface DeliveryPreferences {
  email: boolean;
  emailAddress: string | null;
  sms: boolean;
  smsNumber: string | null;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
  maxPerDay?: number;
}

class NotificationDeliveryOrchestrator {
  async deliverNotification(notification: Notification): Promise<void> {
    // 1. Fetch user delivery preferences
    const prefs = await this.getUserPreferences(notification.userId);

    // 2. Apply rate limiting
    const rateLimitOk = await this.checkRateLimits(notification.userId, prefs);
    if (!rateLimitOk) {
      logger.warn('Rate limit exceeded', { userId: notification.userId });
      return;
    }

    // 3. Check quiet hours
    if (this.isQuietHours(prefs)) {
      await this.scheduleForLater(notification);
      return;
    }

    // 4. Deliver to all enabled channels in parallel
    const deliveryPromises = [];

    if (prefs.email && prefs.emailAddress) {
      deliveryPromises.push(this.deliverEmail(notification, prefs.emailAddress));
    }

    if (prefs.sms && prefs.smsNumber) {
      deliveryPromises.push(this.deliverSMS(notification, prefs.smsNumber));
    }

    // In-app is always delivered
    deliveryPromises.push(this.deliverInApp(notification));

    await Promise.allSettled(deliveryPromises);
  }

  private async checkRateLimits(userId: bigint, prefs: DeliveryPreferences): Promise<boolean> {
    const maxPerDay = prefs.maxPerDay || 50;
    const todayCount = await this.getNotificationCountToday(userId);
    return todayCount < maxPerDay;
  }
}
```

### 4. Delivery Channel Implementations

#### Email Channel (`src/services/delivery/emailChannel.ts`)

```typescript
import sgMail from '@sendgrid/mail';
import { renderEmailTemplate } from '../templates/emailTemplates';

export class EmailDeliveryChannel {
  private sgClient: typeof sgMail;

  constructor() {
    this.sgClient = sgMail;
    this.sgClient.setApiKey(config.sendgrid.apiKey);
  }

  async send(notification: Notification, recipient: string): Promise<DeliveryResult> {
    const deliveryRecord = await this.createDeliveryRecord(notification, 'email', recipient);

    try {
      // Render template
      const template = await renderEmailTemplate(notification);

      // Send via SendGrid
      const result = await this.sgClient.send({
        to: recipient,
        from: config.sendgrid.fromEmail,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      // Update delivery record
      await this.updateDeliveryRecord(deliveryRecord.id, {
        status: 'sent',
        sentAt: new Date(),
        providerId: result[0].headers['x-message-id']
      });

      return { success: true, deliveryId: deliveryRecord.id };

    } catch (error) {
      await this.updateDeliveryRecord(deliveryRecord.id, {
        status: 'failed',
        error: error.message
      });

      // Retry logic
      if (error.code < 500) {
        throw error; // Don't retry client errors
      }

      throw error; // Retry server errors
    }
  }
}
```

#### SMS Channel (`src/services/delivery/smsChannel.ts`)

```typescript
import twilio from 'twilio';

export class SMSDeliveryChannel {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  async send(notification: Notification, recipient: string): Promise<DeliveryResult> {
    const deliveryRecord = await this.createDeliveryRecord(notification, 'sms', recipient);

    try {
      // Truncate message to 160 characters
      const message = this.truncateMessage(notification.message, 160);

      // Send via Twilio
      const result = await this.client.messages.create({
        body: message,
        to: recipient,
        from: config.twilio.fromNumber
      });

      // Update delivery record
      await this.updateDeliveryRecord(deliveryRecord.id, {
        status: 'sent',
        sentAt: new Date(),
        providerId: result.sid
      });

      return { success: true, deliveryId: deliveryRecord.id };

    } catch (error) {
      await this.updateDeliveryRecord(deliveryRecord.id, {
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
  }
}
```

#### In-App Channel (`src/services/delivery/inAppChannel.ts`)

```typescript
export class InAppDeliveryChannel {
  async send(notification: Notification): Promise<DeliveryResult> {
    // In-app notifications are already stored in database
    // This channel handles WebSocket push if user is online

    const deliveryRecord = await this.createDeliveryRecord(notification, 'in_app', 'internal');

    try {
      // Attempt WebSocket push if user is connected
      await this.pushViaWebSocket(notification.userId, notification);

      await this.updateDeliveryRecord(deliveryRecord.id, {
        status: 'delivered',
        sentAt: new Date(),
        deliveredAt: new Date()
      });

      return { success: true, deliveryId: deliveryRecord.id };

    } catch (error) {
      // In-app delivery failure is non-critical (will see on next app open)
      await this.updateDeliveryRecord(deliveryRecord.id, {
        status: 'sent', // Mark as sent even if push failed
        sentAt: new Date()
      });

      return { success: true, deliveryId: deliveryRecord.id };
    }
  }
}
```

---

## Background Job Architecture

### Job Queue Configuration

**Technology**: Bull (Redis-backed)

**Redis Configuration**:
```typescript
// config/redis.ts
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => Math.min(times * 50, 2000)
};
```

### Job Worker Implementation

```typescript
// src/workers/alertEvaluationWorker.ts

import { alertQueue } from '../jobs/alertScheduler';
import { AlertEvaluationOrchestrator } from '../services/alertEvaluator';
import logger from '../config/logger';

const orchestrator = new AlertEvaluationOrchestrator();

// Process periodic evaluation jobs
alertQueue.process('alert:evaluate:periodic', 5, async (job) => {
  logger.info('Processing periodic alert evaluation', { jobId: job.id });

  // Get all active users (paginated)
  const users = await getActiveUsers({ offset: job.data.offset || 0, limit: 100 });

  for (const user of users) {
    try {
      await orchestrator.evaluateUserAlerts({
        userId: user.id,
        partnerId: user.partnerId,
        triggerType: 'periodic'
      });
    } catch (error) {
      logger.error('Failed to evaluate alerts for user', {
        userId: user.id,
        error: error.message
      });
    }
  }

  // Queue next batch if more users exist
  if (users.length === 100) {
    await alertQueue.add('alert:evaluate:periodic', {
      offset: (job.data.offset || 0) + 100
    }, { delay: 1000 });
  }
});

// Process real-time evaluation jobs (high priority)
alertQueue.process('alert:evaluate:realtime', 10, async (job) => {
  const { userId, partnerId, transactionId } = job.data;

  logger.info('Processing real-time alert evaluation', {
    jobId: job.id,
    userId,
    transactionId
  });

  await orchestrator.evaluateUserAlerts({
    userId,
    partnerId,
    triggerType: 'realtime',
    triggerData: { transactionId }
  });
});

// Error handling
alertQueue.on('failed', (job, error) => {
  logger.error('Job failed', {
    jobId: job.id,
    jobName: job.name,
    error: error.message,
    attempts: job.attemptsMade
  });
});

alertQueue.on('completed', (job) => {
  logger.debug('Job completed', {
    jobId: job.id,
    jobName: job.name,
    duration: Date.now() - job.processedOn
  });
});
```

### Job Scheduling Strategy

**Periodic Evaluation** (Every 5 minutes):
- Alert types: `account_threshold`, `goal`, `spending_target`
- Batch size: 100 users per job
- Concurrency: 5 workers
- Timeout: 2 minutes per job

**Daily Evaluation** (6:00 AM user timezone):
- Alert types: `upcoming_bill`
- Process all active bill alerts
- Respect user timezone for delivery

**Real-Time Evaluation** (Event-triggered):
- Alert types: `transaction_limit`, `merchant_name`
- Triggered on: Transaction creation
- High priority queue
- Timeout: 10 seconds

**Job Priority**:
```typescript
const priorities = {
  'alert:evaluate:realtime': 10,      // Highest
  'alert:evaluate:user': 5,           // Manual trigger
  'alert:evaluate:periodic': 3,       // Background
  'alert:evaluate:bills': 2           // Lowest
};
```

---

## Alert Evaluation Strategy

### Batch Processing Architecture

**Goal**: Minimize database queries and maximize throughput

**Strategy**:
1. **Group Alerts by Type**: Process similar alerts together
2. **Batch Context Fetching**: Load all accounts/goals/budgets in one query
3. **Parallel Evaluation**: Evaluate independent alerts concurrently
4. **Result Caching**: Cache evaluation results to prevent duplicate work

**Implementation**:

```typescript
// src/services/alertEvaluator.ts (enhanced)

class AlertEvaluationOrchestrator {
  private async fetchContextDataBatch(
    alertsByType: Map<AlertType, Alert[]>,
    context: EvaluationContext
  ): Promise<ContextData> {
    const queries = [];

    // Batch fetch accounts if needed
    if (alertsByType.has('account_threshold')) {
      const accountIds = alertsByType.get('account_threshold')!
        .map(a => BigInt((a.conditions as any).account_id));

      queries.push(
        prisma.account.findMany({
          where: { id: { in: accountIds } }
        }).then(accounts => ({ accounts }))
      );
    }

    // Batch fetch goals if needed
    if (alertsByType.has('goal')) {
      const goalIds = alertsByType.get('goal')!
        .map(a => BigInt((a.conditions as any).goal_id));

      queries.push(
        prisma.goal.findMany({
          where: { id: { in: goalIds } }
        }).then(goals => ({ goals }))
      );
    }

    // Batch fetch budgets if needed
    if (alertsByType.has('spending_target')) {
      const budgetIds = alertsByType.get('spending_target')!
        .map(a => BigInt((a.conditions as any).budget_id));

      queries.push(
        prisma.budget.findMany({
          where: { id: { in: budgetIds } }
        }).then(budgets => ({ budgets }))
      );
    }

    // Execute all queries in parallel
    const results = await Promise.all(queries);

    // Merge results
    return results.reduce((acc, result) => ({ ...acc, ...result }), {});
  }

  private async evaluateAlertsParallel(
    alerts: Alert[],
    contextData: ContextData
  ): Promise<EvaluationResult[]> {
    // Evaluate alerts in parallel (chunks of 10)
    const chunkSize = 10;
    const results: EvaluationResult[] = [];

    for (let i = 0; i < alerts.length; i += chunkSize) {
      const chunk = alerts.slice(i, i + chunkSize);

      const chunkResults = await Promise.allSettled(
        chunk.map(alert => this.evaluateSingleAlert(alert, contextData))
      );

      results.push(...chunkResults
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<EvaluationResult>).value)
        .filter(r => r.shouldTrigger)
      );
    }

    return results;
  }
}
```

### Deduplication Logic

**Problem**: Prevent duplicate notifications for rapidly changing conditions

**Solution**: Cooldown periods and notification fingerprinting

```typescript
interface NotificationFingerprint {
  alertId: bigint;
  userId: bigint;
  conditionHash: string; // Hash of alert conditions and context
}

class DeduplicationService {
  private cache: Map<string, Date> = new Map();

  async shouldSendNotification(
    alert: Alert,
    context: any,
    cooldownHours: number = 6
  ): Promise<boolean> {
    // Check database lastTriggeredAt
    if (alert.lastTriggeredAt) {
      const hoursSinceLastTrigger =
        (Date.now() - alert.lastTriggeredAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastTrigger < cooldownHours) {
        return false;
      }
    }

    // Check in-memory cache for recent evaluations
    const fingerprint = this.generateFingerprint(alert, context);
    const cacheKey = `${alert.id}:${fingerprint}`;

    const lastSent = this.cache.get(cacheKey);
    if (lastSent) {
      const minutesSinceCache = (Date.now() - lastSent.getTime()) / (1000 * 60);
      if (minutesSinceCache < 30) {
        return false; // Don't send duplicate within 30 minutes
      }
    }

    // Update cache
    this.cache.set(cacheKey, new Date());

    // Cleanup old cache entries (older than 24 hours)
    this.cleanupCache();

    return true;
  }

  private generateFingerprint(alert: Alert, context: any): string {
    const data = JSON.stringify({
      alertType: alert.alertType,
      conditions: alert.conditions,
      contextSnapshot: this.getContextSnapshot(context)
    });

    return crypto.createHash('md5').update(data).digest('hex');
  }
}
```

---

## Trigger Conditions Specification

### 1. Account Threshold Alert

**When**: After transaction posts or balance changes
**Frequency**: Batch evaluation every 5 minutes
**Cooldown**: 6 hours (don't re-trigger for same condition)

**Trigger Logic**:
```typescript
// Conditions:
{
  account_id: "123",
  threshold: "500.00",
  direction: "below" | "above"
}

// Evaluation:
if (direction === 'below') {
  return account.balance < threshold;
}
if (direction === 'above') {
  return account.balance > threshold;
}
```

**Notification Message**:
- Below: `"Your {account_name} balance is below ${threshold}. Current balance: ${balance}"`
- Above: `"Your {account_name} balance is above ${threshold}. Current balance: ${balance}"`

**Deduplication**: Don't send if same direction was triggered within 6 hours

---

### 2. Goal Alert

**When**: After transaction affects goal progress
**Frequency**: Real-time on goal update, batch check every 5 minutes
**Cooldown**: Once per milestone

**Trigger Logic**:
```typescript
// Conditions:
{
  goal_id: "456",
  milestone_percentage: 25 | 50 | 75 | 100
}

// Evaluation:
const progress = (current_amount / target_amount) * 100;
return progress >= milestone_percentage && !previously_notified;
```

**Milestones**: 25%, 50%, 75%, 100%

**Notification Message**:
- `"Your goal '{goal_name}' has reached {progress}% completion!"`

**Deduplication**: Store `milestone_notifications_sent` in alert metadata:
```json
{
  "milestone_notifications_sent": [25, 50]
}
```

Only send if current milestone not in array.

---

### 3. Merchant Name Alert

**When**: Immediately after transaction posts with matching merchant
**Frequency**: Real-time on transaction creation
**Cooldown**: Every occurrence OR daily digest

**Trigger Logic**:
```typescript
// Conditions:
{
  merchant_pattern: "Starbucks",
  match_type: "exact" | "contains"
}

// Evaluation:
const merchantName = transaction.merchantName.toLowerCase();
const pattern = conditions.merchant_pattern.toLowerCase();

if (match_type === 'exact') {
  return merchantName === pattern;
}
return merchantName.includes(pattern);
```

**Notification Message**:
- `"Transaction detected: {merchant_name} for ${amount}"`

**Deduplication Options** (user preference):
- `immediate`: Send every transaction
- `daily_digest`: Aggregate and send once per day
- `first_of_day`: Only first transaction per day

---

### 4. Spending Target Alert

**When**: After transaction posts affecting budget
**Frequency**: Batch evaluation every 5 minutes
**Cooldown**: Once per threshold level per budget period

**Trigger Logic**:
```typescript
// Conditions:
{
  budget_id: "789",
  threshold_percentage: 50 | 80 | 90 | 100
}

// Evaluation:
const percentUsed = (spent / budget_amount) * 100;
return percentUsed >= threshold_percentage && !previously_sent_for_level;
```

**Thresholds**: 50%, 80%, 90%, 100%

**Notification Message**:
- `"Your '{budget_name}' budget is at {percent}% (${spent} of ${budget_amount})"`

**Deduplication**: Track per budget period:
```json
{
  "current_period": "2025-10",
  "thresholds_sent": [50, 80]
}
```

Reset `thresholds_sent` when budget period changes.

---

### 5. Transaction Limit Alert

**When**: Immediately after large transaction posts
**Frequency**: Real-time on transaction creation (high priority)
**Cooldown**: None (every large transaction triggers)

**Trigger Logic**:
```typescript
// Conditions:
{
  amount: "1000.00",
  account_id: "123" (optional)
}

// Evaluation:
const txAmount = Math.abs(transaction.amount);
const meetsAccountFilter = !account_id || transaction.accountId === account_id;

return txAmount >= amount && meetsAccountFilter;
```

**Notification Message**:
- `"Large transaction detected: {description} for ${amount} exceeds your limit of ${limit}"`

**Deduplication**: None (security critical, send every occurrence)

---

### 6. Upcoming Bill Alert

**When**: Daily evaluation at 6:00 AM (user timezone)
**Frequency**: Once per day
**Cooldown**: Once per bill per occurrence

**Trigger Logic**:
```typescript
// Conditions:
{
  bill_id: "321",
  days_before: 3 | 7 | 14
}

// Evaluation:
const today = new Date();
const dueDate = calculateNextDueDate(bill);
const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

return daysUntilDue <= days_before && daysUntilDue >= 0;
```

**Notification Message**:
- 0 days: `"Bill '{bill_name}' for ${amount} is due today"`
- 1 day: `"Bill '{bill_name}' for ${amount} is due tomorrow"`
- N days: `"Bill '{bill_name}' for ${amount} is due in {days} days"`

**Deduplication**: Track per bill occurrence:
```json
{
  "last_due_date_notified": "2025-11-01"
}
```

Only send once per due date.

---

## Notification Delivery Architecture

### Multi-Channel Orchestration

**Delivery Preference Resolution**:

```typescript
// Fetch from User preferences and Alert settings
interface ResolvedPreferences {
  email: {
    enabled: boolean;
    address: string | null;
    verified: boolean;
  };
  sms: {
    enabled: boolean;
    number: string | null;
    verified: boolean;
  };
  inApp: {
    enabled: boolean; // Always true
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
    timezone: string;
  };
  rateLimits: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

async function getDeliveryPreferences(
  userId: bigint,
  alert: Alert
): Promise<ResolvedPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, preferences: true, timezone: true }
  });

  const prefs = (user.preferences as any) || {};

  return {
    email: {
      enabled: alert.emailDelivery && prefs.emailNotifications !== false,
      address: user.email,
      verified: prefs.emailVerified || false
    },
    sms: {
      enabled: alert.smsDelivery && prefs.smsNotifications !== false,
      number: prefs.alertSmsNumber || null,
      verified: prefs.smsVerified || false
    },
    inApp: {
      enabled: true
    },
    quietHours: {
      enabled: prefs.quietHoursEnabled || false,
      start: prefs.quietHoursStart || '22:00',
      end: prefs.quietHoursEnd || '08:00',
      timezone: user.timezone
    },
    rateLimits: {
      maxPerHour: prefs.maxNotificationsPerHour || 10,
      maxPerDay: prefs.maxNotificationsPerDay || 50
    }
  };
}
```

### Email Template System

**Template Engine**: Handlebars

**Template Structure**:
```
templates/
  email/
    base.hbs              # Base layout
    alert_triggered.hbs   # Generic alert template
    account_threshold.hbs # Specific templates
    goal_milestone.hbs
    spending_target.hbs
    transaction_limit.hbs
    upcoming_bill.hbs
    merchant_alert.hbs
```

**Template Renderer**:
```typescript
// src/services/templates/emailTemplates.ts

import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export async function renderEmailTemplate(
  notification: Notification
): Promise<EmailTemplate> {
  const metadata = notification.metadata as any;
  const alertType = metadata.alert_type || 'system';

  // Load template
  const templatePath = path.join(
    __dirname,
    '../../templates/email',
    `${alertType}.hbs`
  );

  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  const template = Handlebars.compile(templateSource);

  // Prepare template data
  const data = {
    title: notification.title,
    message: notification.message,
    metadata: metadata,
    timestamp: notification.createdAt.toISOString(),
    actionUrl: generateActionUrl(notification)
  };

  // Render HTML
  const html = template(data);

  // Generate plain text version
  const text = stripHtml(html);

  // Generate subject
  const subject = notification.title;

  return { subject, html, text };
}

function generateActionUrl(notification: Notification): string {
  const metadata = notification.metadata as any;
  const baseUrl = config.frontend.url;

  switch (metadata.alert_type) {
    case 'account_threshold':
      return `${baseUrl}/accounts/${metadata.account_id}`;
    case 'goal':
      return `${baseUrl}/goals/${metadata.goal_id}`;
    case 'spending_target':
      return `${baseUrl}/budgets/${metadata.budget_id}`;
    case 'transaction_limit':
      return `${baseUrl}/transactions/${metadata.transaction_id}`;
    case 'upcoming_bill':
      return `${baseUrl}/cashflow/bills/${metadata.bill_id}`;
    default:
      return `${baseUrl}/notifications`;
  }
}
```

**Example Template** (`account_threshold.hbs`):
```handlebars
{{> base}}

<div class="alert-notification">
  <h2>{{title}}</h2>

  <p>{{message}}</p>

  <div class="alert-details">
    <p><strong>Account:</strong> {{metadata.account_name}}</p>
    <p><strong>Current Balance:</strong> ${{metadata.current_balance}}</p>
    <p><strong>Threshold:</strong> ${{metadata.threshold}} ({{metadata.direction}})</p>
  </div>

  <a href="{{actionUrl}}" class="btn-primary">View Account</a>
</div>

{{/base}}
```

### SMS Message Formatting

**Character Limit**: 160 characters (SMS standard)

**Message Templates**:

```typescript
// src/services/templates/smsTemplates.ts

export function renderSMSMessage(notification: Notification): string {
  const metadata = notification.metadata as any;

  switch (metadata.alert_type) {
    case 'account_threshold':
      return `${metadata.account_name}: $${metadata.current_balance} (${metadata.direction} $${metadata.threshold})`;

    case 'goal':
      return `Goal "${metadata.goal_name}" reached ${metadata.progress}%!`;

    case 'spending_target':
      return `Budget "${metadata.budget_name}" at ${metadata.percent_used}%`;

    case 'transaction_limit':
      return `Large transaction: $${metadata.amount} (limit: $${metadata.limit})`;

    case 'upcoming_bill':
      return `Bill "${metadata.bill_name}" ($${metadata.amount}) due ${formatDaysUntilDue(metadata.days_until_due)}`;

    case 'merchant_name':
      return `${metadata.merchant_name}: $${metadata.amount}`;

    default:
      return truncate(notification.message, 160);
  }
}

function formatDaysUntilDue(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
```

### Delivery Retry Logic

**Retry Strategy**: Exponential backoff with jitter

```typescript
// src/services/delivery/retryStrategy.ts

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const retryConfigs: Record<string, RetryConfig> = {
  email: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 300000, // 5 minutes
    backoffMultiplier: 2
  },
  sms: {
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 60000, // 1 minute
    backoffMultiplier: 3
  }
};

export class RetryHandler {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    channel: 'email' | 'sms',
    deliveryId: bigint
  ): Promise<T> {
    const config = retryConfigs[channel];
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry client errors (4xx)
        if (this.isClientError(error)) {
          throw error;
        }

        // Log retry attempt
        logger.warn('Delivery attempt failed, retrying', {
          deliveryId,
          channel,
          attempt,
          error: error.message
        });

        // Calculate delay with exponential backoff and jitter
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw new Error(`Delivery failed after ${config.maxAttempts} attempts: ${lastError.message}`);
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.initialDelayMs *
      Math.pow(config.backoffMultiplier, attempt - 1);

    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

    // Add jitter (±25%)
    const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);

    return Math.floor(cappedDelay + jitter);
  }

  private isClientError(error: any): boolean {
    return error.code >= 400 && error.code < 500;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Bounce Handling (Email)

**Problem**: Track delivery failures and invalid email addresses

**Solution**: Webhook integration with SendGrid

```typescript
// src/routes/webhooks/sendgrid.ts

import { Router } from 'express';
import { handleSendGridEvent } from '../../services/delivery/emailBounceHandler';

const router = Router();

router.post('/sendgrid', async (req, res) => {
  const events = req.body;

  for (const event of events) {
    await handleSendGridEvent(event);
  }

  res.status(200).send('OK');
});

export default router;
```

```typescript
// src/services/delivery/emailBounceHandler.ts

export async function handleSendGridEvent(event: any) {
  const { email, event: eventType, sg_message_id, reason } = event;

  // Find delivery record by provider ID
  const delivery = await prisma.notificationDelivery.findFirst({
    where: { providerId: sg_message_id }
  });

  if (!delivery) return;

  switch (eventType) {
    case 'delivered':
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'delivered',
          deliveredAt: new Date()
        }
      });
      break;

    case 'bounce':
    case 'dropped':
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'bounced',
          error: reason
        }
      });

      // Mark user's email as invalid
      await markEmailAsInvalid(delivery.userId, email, reason);
      break;

    case 'spam_report':
      // User marked as spam - disable email notifications
      await disableEmailNotifications(delivery.userId);
      break;
  }
}

async function markEmailAsInvalid(userId: bigint, email: string, reason: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true }
  });

  const prefs = (user?.preferences as any) || {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      preferences: {
        ...prefs,
        emailVerified: false,
        emailBounceReason: reason,
        emailBouncedAt: new Date()
      }
    }
  });
}
```

---

## Database Schema Design

### Enhanced Schema

```prisma
// Add to prisma/schema.prisma

// =============================================================================
// NOTIFICATION DELIVERY TRACKING
// =============================================================================

enum DeliveryStatus {
  pending
  sent
  delivered
  failed
  bounced
  retrying
}

enum DeliveryChannel {
  email
  sms
  push
  in_app
  webhook
}

model NotificationDelivery {
  id              BigInt          @id @default(autoincrement())
  notificationId  BigInt          @map("notification_id")
  channel         DeliveryChannel
  destination     String          // email address, phone number, etc.
  status          DeliveryStatus  @default(pending)

  // Timestamps
  createdAt       DateTime        @default(now()) @map("created_at")
  sentAt          DateTime?       @map("sent_at")
  deliveredAt     DateTime?       @map("delivered_at")
  failedAt        DateTime?       @map("failed_at")

  // Provider info
  providerId      String?         @map("provider_id")     // SendGrid message ID, Twilio SID
  providerName    String?         @map("provider_name")   // "sendgrid", "twilio"

  // Error tracking
  error           String?
  errorCode       String?         @map("error_code")
  attemptCount    Int             @default(0) @map("attempt_count")

  // Metadata
  metadata        Json            @default("{}")

  notification    Notification    @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  @@index([notificationId])
  @@index([channel, status])
  @@index([providerId])
  @@index([createdAt])
  @@map("notification_deliveries")
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

model NotificationTemplate {
  id          BigInt    @id @default(autoincrement())
  partnerId   BigInt?   @map("partner_id")
  alertType   AlertType @map("alert_type")
  channel     DeliveryChannel

  // Template content
  name        String
  subject     String?   // For email
  body        String    @db.Text

  // Template variables (JSON schema)
  variables   Json      @default("{}")

  // Versioning
  version     Int       @default(1)
  active      Boolean   @default(true)

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@unique([partnerId, alertType, channel, version])
  @@index([alertType, channel, active])
  @@map("notification_templates")
}

// =============================================================================
// RATE LIMITING
// =============================================================================

model NotificationRateLimit {
  id          BigInt    @id @default(autoincrement())
  userId      BigInt    @map("user_id")
  channel     DeliveryChannel

  // Time window
  windowStart DateTime  @map("window_start")
  windowEnd   DateTime  @map("window_end")

  // Counts
  count       Int       @default(0)
  limit       Int

  createdAt   DateTime  @default(now()) @map("created_at")

  @@unique([userId, channel, windowStart])
  @@index([userId, channel, windowEnd])
  @@map("notification_rate_limits")
}

// =============================================================================
// ALERT ENHANCEMENTS
// =============================================================================

// Add to existing Alert model:
// - lastEvaluatedAt: DateTime?
// - evaluationCount: Int @default(0)
// - triggerCount: Int @default(0)
// - metadata: Json @default("{}")

// Add to existing Notification model:
// - deliveries: NotificationDelivery[]
```

### Migration Script

```sql
-- Add new tables

CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced', 'retrying');
CREATE TYPE "DeliveryChannel" AS ENUM ('email', 'sms', 'push', 'in_app', 'webhook');

CREATE TABLE "notification_deliveries" (
  "id" BIGSERIAL PRIMARY KEY,
  "notification_id" BIGINT NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
  "channel" "DeliveryChannel" NOT NULL,
  "destination" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "sent_at" TIMESTAMP,
  "delivered_at" TIMESTAMP,
  "failed_at" TIMESTAMP,
  "provider_id" TEXT,
  "provider_name" TEXT,
  "error" TEXT,
  "error_code" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX "idx_notification_deliveries_notification_id" ON "notification_deliveries"("notification_id");
CREATE INDEX "idx_notification_deliveries_channel_status" ON "notification_deliveries"("channel", "status");
CREATE INDEX "idx_notification_deliveries_provider_id" ON "notification_deliveries"("provider_id");
CREATE INDEX "idx_notification_deliveries_created_at" ON "notification_deliveries"("created_at");

CREATE TABLE "notification_templates" (
  "id" BIGSERIAL PRIMARY KEY,
  "partner_id" BIGINT REFERENCES "partners"("id"),
  "alert_type" "AlertType" NOT NULL,
  "channel" "DeliveryChannel" NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "variables" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "idx_notification_templates_unique"
  ON "notification_templates"("partner_id", "alert_type", "channel", "version");
CREATE INDEX "idx_notification_templates_lookup"
  ON "notification_templates"("alert_type", "channel", "active");

CREATE TABLE "notification_rate_limits" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "channel" "DeliveryChannel" NOT NULL,
  "window_start" TIMESTAMP NOT NULL,
  "window_end" TIMESTAMP NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "limit" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "idx_notification_rate_limits_unique"
  ON "notification_rate_limits"("user_id", "channel", "window_start");
CREATE INDEX "idx_notification_rate_limits_lookup"
  ON "notification_rate_limits"("user_id", "channel", "window_end");

-- Enhance existing Alert table
ALTER TABLE "alerts"
  ADD COLUMN "last_evaluated_at" TIMESTAMP,
  ADD COLUMN "evaluation_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "trigger_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "idx_alerts_last_evaluated" ON "alerts"("last_evaluated_at");
CREATE INDEX "idx_alerts_user_active" ON "alerts"("user_id", "active", "deleted_at");
```

---

## Performance Optimization

### Database Indexing Strategy

**Critical Indexes**:

```sql
-- Alerts: Fast lookup by user and type
CREATE INDEX "idx_alerts_user_type_active"
  ON "alerts"("user_id", "alert_type", "active")
  WHERE "deleted_at" IS NULL;

-- Alerts: Evaluation queue optimization
CREATE INDEX "idx_alerts_evaluation_queue"
  ON "alerts"("active", "last_evaluated_at")
  WHERE "deleted_at" IS NULL AND "active" = TRUE;

-- Notifications: Unread count
CREATE INDEX "idx_notifications_unread"
  ON "notifications"("user_id", "read", "created_at")
  WHERE "deleted_at" IS NULL;

-- Notification Deliveries: Status tracking
CREATE INDEX "idx_deliveries_pending"
  ON "notification_deliveries"("status", "created_at")
  WHERE "status" IN ('pending', 'retrying');

-- Accounts: Balance threshold checks
CREATE INDEX "idx_accounts_balance_monitoring"
  ON "accounts"("user_id", "balance", "archived_at")
  WHERE "archived_at" IS NULL;

-- Transactions: Recent transactions for alert evaluation
CREATE INDEX "idx_transactions_recent"
  ON "transactions"("user_id", "posted_at" DESC)
  WHERE "deleted_at" IS NULL;

-- Bills: Upcoming due dates
CREATE INDEX "idx_bills_upcoming"
  ON "cashflow_bills"("user_id", "due_date", "active")
  WHERE "deleted_at" IS NULL AND "active" = TRUE;
```

### Caching Strategy

**Cache Layers**:

```typescript
// src/config/cache.ts

import Redis from 'ioredis';

export const cacheClient = new Redis(config.redis.url);

// Cache TTLs
export const CACHE_TTL = {
  USER_ALERTS: 300,           // 5 minutes
  USER_PREFERENCES: 600,      // 10 minutes
  ACCOUNT_BALANCE: 60,        // 1 minute
  GOAL_PROGRESS: 300,         // 5 minutes
  BUDGET_SPENT: 300,          // 5 minutes
  EVALUATION_RESULT: 1800,    // 30 minutes
  RATE_LIMIT_WINDOW: 3600     // 1 hour
};

// Cache keys
export const cacheKeys = {
  userAlerts: (userId: bigint) => `alerts:user:${userId}`,
  userPreferences: (userId: bigint) => `prefs:user:${userId}`,
  accountBalance: (accountId: bigint) => `account:${accountId}:balance`,
  budgetSpent: (budgetId: bigint) => `budget:${budgetId}:spent`,
  rateLimitWindow: (userId: bigint, channel: string) =>
    `ratelimit:${userId}:${channel}:${getCurrentHour()}`
};
```

**Cache Implementation**:

```typescript
// src/services/cache/alertCache.ts

export class AlertCache {
  async getUserAlerts(userId: bigint): Promise<Alert[] | null> {
    const key = cacheKeys.userAlerts(userId);
    const cached = await cacheClient.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const alerts = await prisma.alert.findMany({
      where: { userId, active: true, deletedAt: null }
    });

    // Store in cache
    await cacheClient.setex(
      key,
      CACHE_TTL.USER_ALERTS,
      JSON.stringify(alerts)
    );

    return alerts;
  }

  async invalidateUserAlerts(userId: bigint): Promise<void> {
    const key = cacheKeys.userAlerts(userId);
    await cacheClient.del(key);
  }
}
```

### Query Optimization

**Batch Loading**:

```typescript
// src/services/dataLoaders.ts

import DataLoader from 'dataloader';

export class AlertDataLoaders {
  accountLoader: DataLoader<bigint, Account>;
  goalLoader: DataLoader<bigint, Goal>;
  budgetLoader: DataLoader<bigint, Budget>;

  constructor() {
    this.accountLoader = new DataLoader(async (ids) => {
      const accounts = await prisma.account.findMany({
        where: { id: { in: ids as bigint[] } }
      });

      // Return in same order as input IDs
      const accountMap = new Map(accounts.map(a => [a.id, a]));
      return ids.map(id => accountMap.get(id) || null);
    });

    this.goalLoader = new DataLoader(async (ids) => {
      const goals = await prisma.goal.findMany({
        where: { id: { in: ids as bigint[] } }
      });

      const goalMap = new Map(goals.map(g => [g.id, g]));
      return ids.map(id => goalMap.get(id) || null);
    });

    this.budgetLoader = new DataLoader(async (ids) => {
      const budgets = await prisma.budget.findMany({
        where: { id: { in: ids as bigint[] } }
      });

      const budgetMap = new Map(budgets.map(b => [b.id, b]));
      return ids.map(id => budgetMap.get(id) || null);
    });
  }
}
```

### Connection Pooling

```typescript
// config/database.ts

import { PrismaClient } from '@prisma/client';

const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' }
  ]
};

export const prisma = new PrismaClient(prismaConfig);

// Connection pool configuration via DATABASE_URL
// postgresql://user:password@host:5432/db?connection_limit=20&pool_timeout=10
```

### Rate Limiting Implementation

```typescript
// src/services/rateLimiting.ts

export class RateLimiter {
  async checkLimit(
    userId: bigint,
    channel: DeliveryChannel,
    limits: { perHour: number; perDay: number }
  ): Promise<boolean> {
    const now = new Date();

    // Check hourly limit
    const hourKey = this.getWindowKey(userId, channel, 'hour', now);
    const hourCount = await this.getCount(hourKey);

    if (hourCount >= limits.perHour) {
      logger.warn('Hourly rate limit exceeded', { userId, channel, hourCount });
      return false;
    }

    // Check daily limit
    const dayKey = this.getWindowKey(userId, channel, 'day', now);
    const dayCount = await this.getCount(dayKey);

    if (dayCount >= limits.perDay) {
      logger.warn('Daily rate limit exceeded', { userId, channel, dayCount });
      return false;
    }

    return true;
  }

  async incrementCount(
    userId: bigint,
    channel: DeliveryChannel
  ): Promise<void> {
    const now = new Date();

    // Increment hourly counter
    const hourKey = this.getWindowKey(userId, channel, 'hour', now);
    await cacheClient.incr(hourKey);
    await cacheClient.expire(hourKey, 3600); // 1 hour TTL

    // Increment daily counter
    const dayKey = this.getWindowKey(userId, channel, 'day', now);
    await cacheClient.incr(dayKey);
    await cacheClient.expire(dayKey, 86400); // 24 hour TTL
  }

  private getWindowKey(
    userId: bigint,
    channel: DeliveryChannel,
    window: 'hour' | 'day',
    date: Date
  ): string {
    if (window === 'hour') {
      const hour = date.toISOString().substring(0, 13); // 2025-10-04T14
      return `ratelimit:${userId}:${channel}:${hour}`;
    } else {
      const day = date.toISOString().substring(0, 10); // 2025-10-04
      return `ratelimit:${userId}:${channel}:${day}`;
    }
  }

  private async getCount(key: string): Promise<number> {
    const count = await cacheClient.get(key);
    return count ? parseInt(count) : 0;
  }
}
```

---

## Scalability Design

### Horizontal Scaling Architecture

**Worker Scaling Strategy**:

```
┌──────────────────────────────────────────────────────────┐
│                    Load Balancer (NGINX)                  │
└──────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ↓               ↓               ↓
     ┌─────────┐     ┌─────────┐     ┌─────────┐
     │  API    │     │  API    │     │  API    │
     │ Server 1│     │ Server 2│     │ Server 3│
     └─────────┘     └─────────┘     └─────────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │   Redis (Job Queue)      │
              └─────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ↓               ↓               ↓
     ┌─────────┐     ┌─────────┐     ┌─────────┐
     │ Worker  │     │ Worker  │     │ Worker  │
     │    1    │     │    2    │     │    3    │
     └─────────┘     └─────────┘     └─────────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │   PostgreSQL (Master)    │
              └─────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ↓                         ↓
     ┌────────────────┐        ┌────────────────┐
     │  Read Replica  │        │  Read Replica  │
     │       1        │        │       2        │
     └────────────────┘        └────────────────┘
```

### Stateless Worker Design

**Worker Implementation**:

```typescript
// src/workers/index.ts

import { alertQueue } from '../jobs/alertScheduler';
import { deliveryQueue } from '../jobs/deliveryScheduler';

// Workers are stateless - can scale horizontally
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5');

alertQueue.process('*', CONCURRENCY, async (job) => {
  // Process job
  // No shared state - all state in Redis/PostgreSQL
});

deliveryQueue.process('*', CONCURRENCY, async (job) => {
  // Process delivery job
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await alertQueue.close();
  await deliveryQueue.close();
  process.exit(0);
});
```

### Database Sharding Strategy (Future)

**Shard by User ID**:

```typescript
// Future implementation for >100K users

function getUserShard(userId: bigint): string {
  // Simple modulo sharding
  const shardCount = 4;
  const shardId = Number(userId) % shardCount;
  return `shard_${shardId}`;
}

function getShardConnection(userId: bigint): PrismaClient {
  const shard = getUserShard(userId);
  return shardConnections[shard];
}

// Usage:
const prisma = getShardConnection(userId);
const alerts = await prisma.alert.findMany({ where: { userId } });
```

### Load Distribution

**Queue Priority System**:

```typescript
// src/jobs/alertScheduler.ts

// High priority: Real-time alerts
alertQueue.add('alert:evaluate:realtime', data, {
  priority: 10,
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 }
});

// Medium priority: User-triggered
alertQueue.add('alert:evaluate:user', data, {
  priority: 5,
  attempts: 3
});

// Low priority: Periodic background
alertQueue.add('alert:evaluate:periodic', data, {
  priority: 1,
  attempts: 2
});
```

### Auto-Scaling Configuration (Kubernetes)

```yaml
# k8s/worker-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: alert-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: alert-worker
  template:
    metadata:
      labels:
        app: alert-worker
    spec:
      containers:
      - name: worker
        image: pfm-backend-simulator:latest
        command: ["npm", "run", "worker"]
        env:
        - name: WORKER_CONCURRENCY
          value: "5"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: alert-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: alert-worker
  minReplicas: 3
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: External
    external:
      metric:
        name: redis_queue_depth
      target:
        type: AverageValue
        averageValue: "100"
```

---

## Reliability Patterns

### Circuit Breaker Implementation

**Purpose**: Prevent cascading failures when external services (SendGrid, Twilio) are down

```typescript
// src/services/circuitBreaker.ts

enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject requests
  HALF_OPEN = 'half_open' // Testing recovery
}

interface CircuitBreakerConfig {
  failureThreshold: number;  // Number of failures to open circuit
  successThreshold: number;  // Number of successes to close circuit
  timeout: number;           // How long to wait before trying again (ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTime = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker OPEN for ${this.name}`);
      }
      // Transition to HALF_OPEN to test
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info(`Circuit breaker CLOSED for ${this.name}`);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.timeout;

      logger.error(`Circuit breaker OPEN for ${this.name}`, {
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttemptTime)
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Usage:
const emailCircuitBreaker = new CircuitBreaker('email-delivery', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000 // 1 minute
});

export async function sendEmailWithCircuitBreaker(
  notification: Notification,
  recipient: string
): Promise<void> {
  await emailCircuitBreaker.execute(async () => {
    return await emailChannel.send(notification, recipient);
  });
}
```

### Idempotency Implementation

**Purpose**: Safely retry operations without duplicate notifications

```typescript
// src/services/idempotency.ts

import crypto from 'crypto';

export class IdempotencyService {
  async executeIdempotent<T>(
    key: string,
    operation: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    const idempotencyKey = `idempotency:${key}`;

    // Check if operation already completed
    const cached = await cacheClient.get(idempotencyKey);
    if (cached) {
      logger.debug('Idempotent operation - returning cached result', { key });
      return JSON.parse(cached);
    }

    // Execute operation
    const result = await operation();

    // Cache result
    await cacheClient.setex(
      idempotencyKey,
      ttlSeconds,
      JSON.stringify(result)
    );

    return result;
  }

  generateKey(components: any[]): string {
    const data = JSON.stringify(components);
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// Usage:
const idempotency = new IdempotencyService();

async function createNotificationIdempotent(
  userId: bigint,
  alertId: bigint,
  data: any
): Promise<Notification> {
  const key = idempotency.generateKey([userId, alertId, data]);

  return await idempotency.executeIdempotent(key, async () => {
    return await createNotification(userId, data);
  });
}
```

### Dead Letter Queue

**Purpose**: Handle permanently failed jobs for manual review

```typescript
// src/jobs/deadLetterQueue.ts

import Bull from 'bull';

export const deadLetterQueue = new Bull('dead-letter', {
  redis: config.redis.url
});

alertQueue.on('failed', async (job, error) => {
  if (job.attemptsMade >= job.opts.attempts!) {
    // Move to dead letter queue
    await deadLetterQueue.add('failed-alert', {
      originalJob: job.data,
      failureReason: error.message,
      failedAt: new Date(),
      attempts: job.attemptsMade
    }, {
      removeOnComplete: false // Keep for investigation
    });

    logger.error('Job moved to dead letter queue', {
      jobId: job.id,
      error: error.message
    });
  }
});

// Admin endpoint to review failed jobs
export async function getDeadLetterJobs(limit = 100): Promise<any[]> {
  const jobs = await deadLetterQueue.getJobs(['completed', 'waiting'], 0, limit);
  return jobs.map(job => ({
    id: job.id,
    data: job.data,
    failedAt: job.data.failedAt,
    reason: job.data.failureReason
  }));
}
```

### Data Consistency Patterns

**Transaction Boundaries**:

```typescript
// src/services/alertEvaluator.ts

async function triggerAlert(alert: Alert, context: any): Promise<void> {
  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // 1. Create notification
    const notification = await tx.notification.create({
      data: {
        userId: alert.userId,
        alertId: alert.id,
        title: generateTitle(alert, context),
        message: generateMessage(alert, context),
        metadata: context
      }
    });

    // 2. Update alert lastTriggeredAt
    await tx.alert.update({
      where: { id: alert.id },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: { increment: 1 }
      }
    });

    // 3. Create delivery records
    await tx.notificationDelivery.createMany({
      data: [
        {
          notificationId: notification.id,
          channel: 'email',
          destination: context.emailAddress,
          status: 'pending'
        },
        {
          notificationId: notification.id,
          channel: 'sms',
          destination: context.smsNumber,
          status: 'pending'
        }
      ]
    });
  });

  // After transaction commits, enqueue delivery jobs
  await deliveryQueue.add('deliver-notification', {
    notificationId: notification.id
  });
}
```

### Monitoring & Alerting

**Metrics Collection**:

```typescript
// src/services/metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  // Job processing
  jobsProcessed: new Counter({
    name: 'alert_jobs_processed_total',
    help: 'Total number of alert jobs processed',
    labelNames: ['job_type', 'status']
  }),

  jobDuration: new Histogram({
    name: 'alert_job_duration_seconds',
    help: 'Duration of alert job processing',
    labelNames: ['job_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  // Alert evaluation
  alertsEvaluated: new Counter({
    name: 'alerts_evaluated_total',
    help: 'Total number of alerts evaluated',
    labelNames: ['alert_type', 'triggered']
  }),

  // Notification delivery
  notificationsDelivered: new Counter({
    name: 'notifications_delivered_total',
    help: 'Total notifications delivered',
    labelNames: ['channel', 'status']
  }),

  deliveryDuration: new Histogram({
    name: 'notification_delivery_duration_seconds',
    help: 'Duration of notification delivery',
    labelNames: ['channel'],
    buckets: [0.1, 0.5, 1, 2, 5]
  }),

  // Queue depth
  queueDepth: new Gauge({
    name: 'alert_queue_depth',
    help: 'Current depth of alert queue',
    labelNames: ['queue_name']
  }),

  // Circuit breaker
  circuitBreakerState: new Gauge({
    name: 'circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=half_open, 2=open)',
    labelNames: ['service']
  })
};

// Update queue depth every 10 seconds
setInterval(async () => {
  const waiting = await alertQueue.getWaitingCount();
  const active = await alertQueue.getActiveCount();

  metrics.queueDepth.set({ queue_name: 'alert' }, waiting + active);
}, 10000);
```

**Alerting Rules** (Prometheus):

```yaml
# prometheus/alerts.yml

groups:
  - name: alert_notification_system
    interval: 30s
    rules:
      # High failure rate
      - alert: HighNotificationFailureRate
        expr: |
          sum(rate(notifications_delivered_total{status="failed"}[5m]))
          /
          sum(rate(notifications_delivered_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Notification failure rate above 5%"

      # Queue depth growing
      - alert: AlertQueueBacklog
        expr: alert_queue_depth{queue_name="alert"} > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Alert queue depth exceeds 1000"

      # Circuit breaker open
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state > 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker open for {{ $labels.service }}"

      # Slow delivery
      - alert: SlowNotificationDelivery
        expr: |
          histogram_quantile(0.95,
            rate(notification_delivery_duration_seconds_bucket[5m])
          ) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "95th percentile delivery time > 5 seconds"
```

---

## Technology Stack

### Core Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Runtime** | Node.js | 20+ | JavaScript runtime |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Framework** | Express.js | 4.x | Web server |
| **Database** | PostgreSQL | 14+ | Primary data store |
| **ORM** | Prisma | 5.x | Database access |
| **Job Queue** | Bull | 4.x | Background jobs |
| **Cache** | Redis | 7.x | Caching & queue backend |
| **Logger** | Pino | 8.x | Structured logging |

### External Services

| Service | Provider | Purpose | Cost Model |
|---------|----------|---------|------------|
| **Email** | SendGrid | Transactional email | $14.95/mo (40K emails) |
| **SMS** | Twilio | SMS delivery | $0.0079/SMS |
| **Monitoring** | DataDog / New Relic | APM & metrics | ~$15/host/mo |
| **Error Tracking** | Sentry | Error monitoring | Free tier available |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Jest** | Testing framework |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Nodemon** | Development hot reload |
| **ts-node** | TypeScript execution |

### Infrastructure (Production)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Container** | Docker | Application packaging |
| **Orchestration** | Kubernetes | Container orchestration |
| **Load Balancer** | NGINX / AWS ALB | Traffic distribution |
| **CI/CD** | GitHub Actions / GitLab CI | Deployment pipeline |

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pfm_simulator
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# SendGrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=alerts@pfm-app.com
SENDGRID_FROM_NAME=PFM Alerts

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM_NUMBER=+15551234567

# Job Queue
WORKER_CONCURRENCY=5
JOB_MAX_ATTEMPTS=3

# Rate Limiting
RATE_LIMIT_HOURLY=10
RATE_LIMIT_DAILY=50

# Monitoring
DATADOG_API_KEY=xxxxx
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
FRONTEND_URL=https://app.pfm.com
```

---

## Implementation Roadmap

### Phase 1: MVP (2-3 weeks)

**Goal**: Basic background job system with email notifications

**Deliverables**:
- ✅ Bull queue setup with Redis
- ✅ Simple cron job for periodic evaluation (every 5 minutes)
- ✅ SendGrid integration for email
- ✅ Basic email templates
- ✅ In-app notifications (already working)
- ✅ Manual trigger endpoint

**Success Criteria**:
- Alerts evaluated every 5 minutes
- Email notifications delivered
- Basic error logging

**Tasks**:
1. Install Bull and Redis client
2. Create `src/jobs/alertScheduler.ts`
3. Create `src/workers/alertEvaluationWorker.ts`
4. Implement SendGrid integration in `src/services/delivery/emailChannel.ts`
5. Create email templates in `templates/email/`
6. Add manual trigger endpoint `/api/v2/alerts/:id/evaluate`
7. Add basic job monitoring endpoint `/api/v2/admin/jobs/status`

**Code Example**:
```typescript
// src/jobs/alertScheduler.ts
import Bull from 'bull';
import config from '../config';

export const alertQueue = new Bull('alert-evaluation', {
  redis: config.redis.url
});

alertQueue.add('alert:evaluate:periodic', {}, {
  repeat: { cron: '*/5 * * * *' }
});
```

---

### Phase 2: Production Ready (3-4 weeks)

**Goal**: Reliable, monitored system with retry logic and comprehensive error handling

**Deliverables**:
- ✅ Database schema enhancements (NotificationDelivery table)
- ✅ Retry logic with exponential backoff
- ✅ Email bounce handling (SendGrid webhooks)
- ✅ SMS integration (Twilio)
- ✅ Rate limiting
- ✅ Dead letter queue
- ✅ Metrics collection (Prometheus)
- ✅ Logging enhancements (structured logs)
- ✅ Admin dashboard for job monitoring

**Success Criteria**:
- 99% delivery success rate
- Failed jobs automatically retried
- Bounce/unsubscribe handling
- Rate limits enforced
- Comprehensive monitoring

**Tasks**:
1. Run Prisma migration for new tables
2. Implement RetryHandler with exponential backoff
3. Add SendGrid webhook endpoint for bounces
4. Implement Twilio SMS integration
5. Build RateLimiter service
6. Set up dead letter queue
7. Add Prometheus metrics
8. Create admin dashboard UI
9. Write integration tests

---

### Phase 3: Scale & Optimize (2-3 weeks)

**Goal**: Handle 10,000+ users with millions of alerts efficiently

**Deliverables**:
- ✅ Batch processing optimization
- ✅ Database indexing
- ✅ Caching layer (Redis)
- ✅ DataLoader implementation
- ✅ Parallel evaluation
- ✅ Connection pooling
- ✅ Worker auto-scaling (Kubernetes HPA)
- ✅ Performance testing
- ✅ Load testing results

**Success Criteria**:
- <5 second evaluation per 1000 alerts
- Database query count reduced 50%
- Cache hit rate >80%
- Support 10K concurrent users

**Tasks**:
1. Implement batch context fetching
2. Add database indexes
3. Build caching layer
4. Integrate DataLoaders
5. Optimize query patterns
6. Configure Kubernetes HPA
7. Run load tests (k6, Artillery)
8. Optimize based on results

---

### Phase 4: Enterprise (3-4 weeks)

**Goal**: Advanced features and multi-region support

**Deliverables**:
- ✅ Real-time evaluation for critical alerts
- ✅ WebSocket push for in-app notifications
- ✅ Notification templates (customizable)
- ✅ A/B testing framework for messaging
- ✅ Multi-region deployment
- ✅ Advanced analytics dashboard
- ✅ User preference management UI
- ✅ Notification history search

**Success Criteria**:
- <1 second delivery for real-time alerts
- Template customization per partner
- Multi-region failover working
- Rich analytics available

**Tasks**:
1. Build real-time evaluation triggers
2. Implement WebSocket server
3. Create template management system
4. Build A/B testing framework
5. Set up multi-region infrastructure
6. Create analytics dashboard
7. Build user settings UI
8. Implement search functionality

---

## Operational Runbook

### Deployment

**Standard Deployment**:

```bash
# 1. Build application
npm run build

# 2. Run database migrations
npm run prisma:migrate:deploy

# 3. Generate Prisma client
npm run prisma:generate

# 4. Start API server (PM2 or Kubernetes)
pm2 start dist/src/index.js --name pfm-api

# 5. Start workers (separate process)
pm2 start dist/src/workers/index.js --name pfm-workers -i 3
```

**Docker Deployment**:

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY prisma ./prisma
RUN npx prisma generate

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/src/index.js"]
```

**Kubernetes Deployment**:

```bash
# Deploy API servers
kubectl apply -f k8s/api-deployment.yaml

# Deploy workers
kubectl apply -f k8s/worker-deployment.yaml

# Apply autoscaling
kubectl apply -f k8s/worker-hpa.yaml
```

---

### Monitoring

**Key Metrics to Monitor**:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Job failure rate | >5% | Investigate errors, check external service status |
| Queue depth | >1000 | Scale workers, check for stuck jobs |
| Delivery failure | >5% | Check SendGrid/Twilio status, review logs |
| P95 latency | >5s | Optimize queries, check database load |
| Circuit breaker | Open | Check external service, review error logs |
| Memory usage | >80% | Scale pods, investigate memory leaks |

**Dashboards** (Grafana):

```yaml
# grafana/dashboard.json
{
  "title": "Alert Notification System",
  "panels": [
    {
      "title": "Job Processing Rate",
      "query": "rate(alert_jobs_processed_total[5m])"
    },
    {
      "title": "Notification Delivery Success Rate",
      "query": "sum(rate(notifications_delivered_total{status='delivered'}[5m])) / sum(rate(notifications_delivered_total[5m]))"
    },
    {
      "title": "Queue Depth",
      "query": "alert_queue_depth"
    }
  ]
}
```

---

### Troubleshooting

**Problem**: High job failure rate

**Diagnosis**:
```bash
# Check failed jobs
curl http://localhost:3000/api/v2/admin/jobs/failed?limit=100

# Check worker logs
kubectl logs -l app=alert-worker --tail=100

# Check database connectivity
psql -h localhost -U postgres -d pfm_simulator -c "SELECT 1;"
```

**Solutions**:
- Restart workers if hung
- Check external service status (SendGrid, Twilio)
- Review error messages in logs
- Check database connection pool

---

**Problem**: Queue depth growing

**Diagnosis**:
```bash
# Check queue stats
curl http://localhost:3000/api/v2/admin/jobs/stats

# Check worker count
kubectl get pods -l app=alert-worker

# Check worker CPU/memory
kubectl top pods -l app=alert-worker
```

**Solutions**:
- Scale workers: `kubectl scale deployment alert-worker --replicas=10`
- Increase concurrency: Set `WORKER_CONCURRENCY=10`
- Check for stuck jobs and remove them
- Optimize slow queries

---

**Problem**: Email delivery failures

**Diagnosis**:
```bash
# Check SendGrid status
curl https://status.sendgrid.com/api/v2/status.json

# Check delivery records
psql -c "SELECT status, count(*) FROM notification_deliveries WHERE channel='email' GROUP BY status;"

# Check circuit breaker state
curl http://localhost:3000/api/v2/admin/circuit-breakers
```

**Solutions**:
- Verify SendGrid API key
- Check for bounced emails in webhook logs
- Wait for circuit breaker to reset
- Review email templates for formatting issues

---

### Maintenance

**Daily Tasks**:
- Review job failure logs
- Check queue depth trends
- Monitor delivery success rates
- Review dead letter queue

**Weekly Tasks**:
- Analyze performance trends
- Review rate limit violations
- Clean up old notification deliveries (>90 days)
- Update notification templates if needed

**Monthly Tasks**:
- Review and optimize database queries
- Analyze user notification preferences
- Review cost (SendGrid, Twilio usage)
- Update dependencies

**Database Cleanup**:

```sql
-- Archive old notifications (>90 days)
UPDATE notifications
SET deleted_at = NOW()
WHERE created_at < NOW() - INTERVAL '90 days'
  AND deleted_at IS NULL;

-- Delete old delivery records (>180 days)
DELETE FROM notification_deliveries
WHERE created_at < NOW() - INTERVAL '180 days';

-- Vacuum tables
VACUUM ANALYZE notifications;
VACUUM ANALYZE notification_deliveries;
```

---

## Appendix

### API Endpoints

**Admin Endpoints**:

```
GET /api/v2/admin/jobs/stats
  → Queue statistics

GET /api/v2/admin/jobs/failed
  → Failed jobs list

POST /api/v2/admin/jobs/retry/:jobId
  → Retry failed job

GET /api/v2/admin/circuit-breakers
  → Circuit breaker status

GET /api/v2/admin/metrics
  → Prometheus metrics

POST /api/v2/admin/alerts/evaluate-user/:userId
  → Manually trigger user alert evaluation
```

**User Endpoints** (existing):

```
GET /api/v2/alerts
  → List user alerts

POST /api/v2/alerts
  → Create alert

PUT /api/v2/alerts/:id
  → Update alert

DELETE /api/v2/alerts/:id
  → Delete alert

GET /api/v2/notifications
  → List notifications

PUT /api/v2/notifications/:id/read
  → Mark as read

DELETE /api/v2/notifications/:id
  → Delete notification
```

---

### Code Structure

```
src/
├── config/
│   ├── database.ts          # Prisma configuration
│   ├── redis.ts             # Redis client
│   ├── logger.ts            # Pino logger
│   └── index.ts             # Config aggregator
│
├── jobs/
│   ├── alertScheduler.ts    # Bull queue setup
│   ├── deliveryScheduler.ts # Delivery queue
│   └── deadLetterQueue.ts   # Failed job handling
│
├── workers/
│   ├── index.ts             # Worker entry point
│   ├── alertWorker.ts       # Alert evaluation worker
│   └── deliveryWorker.ts    # Notification delivery worker
│
├── services/
│   ├── alertEvaluator.ts    # Evaluation logic (enhanced)
│   ├── alertService.ts      # Alert CRUD (existing)
│   ├── notificationService.ts
│   ├── notificationDelivery.ts # Delivery orchestrator
│   ├── circuitBreaker.ts
│   ├── rateLimiting.ts
│   ├── idempotency.ts
│   ├── cache/
│   │   └── alertCache.ts
│   ├── delivery/
│   │   ├── emailChannel.ts
│   │   ├── smsChannel.ts
│   │   ├── inAppChannel.ts
│   │   ├── retryStrategy.ts
│   │   └── emailBounceHandler.ts
│   └── templates/
│       ├── emailTemplates.ts
│       └── smsTemplates.ts
│
├── routes/
│   ├── admin/
│   │   ├── jobs.ts
│   │   └── metrics.ts
│   └── webhooks/
│       ├── sendgrid.ts
│       └── twilio.ts
│
├── utils/
│   ├── dataLoaders.ts
│   └── metrics.ts
│
└── index.ts                 # Application entry point

templates/
├── email/
│   ├── base.hbs
│   ├── account_threshold.hbs
│   ├── goal.hbs
│   ├── spending_target.hbs
│   ├── transaction_limit.hbs
│   ├── upcoming_bill.hbs
│   └── merchant_name.hbs
└── sms/
    └── (handled in code)

tests/
├── integration/
│   ├── alertEvaluation.test.ts
│   ├── emailDelivery.test.ts
│   └── smsDelivery.test.ts
└── unit/
    ├── circuitBreaker.test.ts
    ├── rateLimiting.test.ts
    └── retryStrategy.test.ts
```

---

### Configuration Files

**Bull Queue Configuration**:

```typescript
// config/queue.ts
export const queueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  },
  limiter: {
    max: 1000,        // Max jobs per duration
    duration: 60000   // 1 minute
  }
};
```

**Logger Configuration**:

```typescript
// config/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['email', 'phone', 'password'],
    remove: true
  }
});
```

---

### Testing Strategy

**Unit Tests**:
- Test individual evaluators
- Test retry logic
- Test rate limiting
- Test circuit breaker

**Integration Tests**:
- Test end-to-end alert evaluation
- Test email delivery
- Test SMS delivery
- Test job processing

**Load Tests** (k6):

```javascript
// tests/load/alert-evaluation.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 0 }     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% < 500ms
    http_req_failed: ['rate<0.01']     // <1% failures
  }
};

export default function () {
  const res = http.post('http://localhost:3000/api/v2/admin/jobs/trigger', {
    userId: __VU // Virtual user ID
  });

  check(res, {
    'status is 200': (r) => r.status === 200
  });

  sleep(1);
}
```

---

## Summary

This architecture provides a **comprehensive, production-ready** alert notification system with:

✅ **Scalability**: Horizontal scaling via stateless workers, database read replicas, and auto-scaling
✅ **Reliability**: Circuit breakers, retry logic, idempotency, transaction boundaries
✅ **Performance**: Caching, batch processing, parallel evaluation, optimized queries
✅ **Observability**: Prometheus metrics, structured logging, distributed tracing
✅ **Maintainability**: Clear separation of concerns, comprehensive testing, documentation

**Next Steps**:
1. Review and approve architecture
2. Begin Phase 1 implementation (MVP)
3. Set up development environment (Redis, SendGrid sandbox)
4. Implement core components
5. Write tests
6. Deploy to staging
7. Load test and optimize
8. Deploy to production

---

**Document Version**: 1.0
**Last Updated**: 2025-10-04
**Author**: System Architect (Claude Code)
**Status**: Ready for Implementation
