/**
 * Alert Service
 * Business logic for alert CRUD operations and notification management
 */

import { PrismaClient, Alert, Notification, AlertType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// =============================================================================
// TYPES
// =============================================================================

export interface CreateAlertData {
  alertType: AlertType;
  name: string;
  sourceType?: string;
  sourceId?: bigint;
  conditions: Record<string, any>;
  emailDelivery: boolean;
  smsDelivery: boolean;
}

export interface UpdateAlertData {
  name?: string;
  conditions?: Record<string, any>;
  emailDelivery?: boolean;
  smsDelivery?: boolean;
  active?: boolean;
}

export interface CreateNotificationData {
  alertId?: bigint;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// ALERT CRUD
// =============================================================================

/**
 * Get all alerts for a user
 */
export async function getAllAlerts(
  userId: bigint,
  options: { includeInactive?: boolean } = {}
): Promise<Alert[]> {
  const where: any = {
    userId,
    deletedAt: null
  };

  if (!options.includeInactive) {
    where.active = true;
  }

  return await prisma.alert.findMany({
    where,
    orderBy: [
      { active: 'desc' },
      { createdAt: 'desc' }
    ]
  });
}

/**
 * Get a specific alert by ID
 */
export async function getAlertById(
  userId: bigint,
  alertId: bigint
): Promise<Alert | null> {
  return await prisma.alert.findFirst({
    where: {
      id: alertId,
      userId,
      deletedAt: null
    }
  });
}

/**
 * Create a new alert
 */
export async function createAlert(
  userId: bigint,
  data: CreateAlertData
): Promise<Alert> {
  return await prisma.alert.create({
    data: {
      userId,
      alertType: data.alertType,
      name: data.name,
      sourceType: data.sourceType || null,
      sourceId: data.sourceId || null,
      conditions: data.conditions,
      emailDelivery: data.emailDelivery,
      smsDelivery: data.smsDelivery,
      active: true
    }
  });
}

/**
 * Update an alert
 */
export async function updateAlert(
  userId: bigint,
  alertId: bigint,
  data: UpdateAlertData
): Promise<Alert | null> {
  // Verify ownership
  const existing = await getAlertById(userId, alertId);
  if (!existing) {
    return null;
  }

  return await prisma.alert.update({
    where: { id: alertId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.conditions && { conditions: data.conditions }),
      ...(data.emailDelivery !== undefined && { emailDelivery: data.emailDelivery }),
      ...(data.smsDelivery !== undefined && { smsDelivery: data.smsDelivery }),
      ...(data.active !== undefined && { active: data.active }),
      updatedAt: new Date()
    }
  });
}

/**
 * Delete an alert (soft delete)
 */
export async function deleteAlert(
  userId: bigint,
  alertId: bigint
): Promise<boolean> {
  const existing = await getAlertById(userId, alertId);
  if (!existing) {
    return false;
  }

  await prisma.alert.update({
    where: { id: alertId },
    data: { deletedAt: new Date() }
  });

  return true;
}

/**
 * Enable an alert
 */
export async function enableAlert(
  userId: bigint,
  alertId: bigint
): Promise<Alert | null> {
  return await updateAlert(userId, alertId, { active: true });
}

/**
 * Disable an alert
 */
export async function disableAlert(
  userId: bigint,
  alertId: bigint
): Promise<Alert | null> {
  return await updateAlert(userId, alertId, { active: false });
}

// =============================================================================
// TYPE-SPECIFIC ALERT HELPERS
// =============================================================================

/**
 * Create account threshold alert
 */
export async function createAccountThresholdAlert(
  userId: bigint,
  data: {
    name: string;
    accountId: bigint;
    threshold: string;
    direction: 'below' | 'above';
    emailDelivery: boolean;
    smsDelivery: boolean;
  }
): Promise<Alert> {
  // Verify account ownership
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId, archivedAt: null }
  });

  if (!account) {
    throw new Error('Account not found or access denied');
  }

  return await createAlert(userId, {
    alertType: 'account_threshold',
    name: data.name,
    sourceType: 'account',
    sourceId: data.accountId,
    conditions: {
      account_id: data.accountId.toString(),
      threshold: data.threshold,
      direction: data.direction
    },
    emailDelivery: data.emailDelivery,
    smsDelivery: data.smsDelivery
  });
}

/**
 * Create goal alert
 */
export async function createGoalAlert(
  userId: bigint,
  data: {
    name: string;
    goalId: bigint;
    milestonePercentage: number;
    emailDelivery: boolean;
    smsDelivery: boolean;
  }
): Promise<Alert> {
  // Verify goal ownership
  const goal = await prisma.goal.findFirst({
    where: { id: data.goalId, userId, deletedAt: null }
  });

  if (!goal) {
    throw new Error('Goal not found or access denied');
  }

  return await createAlert(userId, {
    alertType: 'goal',
    name: data.name,
    sourceType: 'goal',
    sourceId: data.goalId,
    conditions: {
      goal_id: data.goalId.toString(),
      milestone_percentage: data.milestonePercentage
    },
    emailDelivery: data.emailDelivery,
    smsDelivery: data.smsDelivery
  });
}

/**
 * Create merchant name alert
 */
export async function createMerchantNameAlert(
  userId: bigint,
  data: {
    name: string;
    merchantPattern: string;
    matchType: 'exact' | 'contains';
    emailDelivery: boolean;
    smsDelivery: boolean;
  }
): Promise<Alert> {
  return await createAlert(userId, {
    alertType: 'merchant_name',
    name: data.name,
    conditions: {
      merchant_pattern: data.merchantPattern,
      match_type: data.matchType
    },
    emailDelivery: data.emailDelivery,
    smsDelivery: data.smsDelivery
  });
}

/**
 * Create spending target alert
 */
export async function createSpendingTargetAlert(
  userId: bigint,
  data: {
    name: string;
    budgetId: bigint;
    thresholdPercentage: number;
    emailDelivery: boolean;
    smsDelivery: boolean;
  }
): Promise<Alert> {
  // Verify budget ownership
  const budget = await prisma.budget.findFirst({
    where: { id: data.budgetId, userId, deletedAt: null }
  });

  if (!budget) {
    throw new Error('Budget not found or access denied');
  }

  return await createAlert(userId, {
    alertType: 'spending_target',
    name: data.name,
    sourceType: 'budget',
    sourceId: data.budgetId,
    conditions: {
      budget_id: data.budgetId.toString(),
      threshold_percentage: data.thresholdPercentage
    },
    emailDelivery: data.emailDelivery,
    smsDelivery: data.smsDelivery
  });
}

/**
 * Create transaction limit alert
 */
export async function createTransactionLimitAlert(
  userId: bigint,
  data: {
    name: string;
    accountId?: bigint;
    amount: string;
    emailDelivery: boolean;
    smsDelivery: boolean;
  }
): Promise<Alert> {
  // Verify account ownership if provided
  if (data.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId, archivedAt: null }
    });

    if (!account) {
      throw new Error('Account not found or access denied');
    }
  }

  return await createAlert(userId, {
    alertType: 'transaction_limit',
    name: data.name,
    sourceType: data.accountId ? 'account' : undefined,
    sourceId: data.accountId || undefined,
    conditions: {
      ...(data.accountId && { account_id: data.accountId.toString() }),
      amount: data.amount
    },
    emailDelivery: data.emailDelivery,
    smsDelivery: data.smsDelivery
  });
}

/**
 * Create upcoming bill alert
 */
export async function createUpcomingBillAlert(
  userId: bigint,
  data: {
    name: string;
    billId: bigint;
    daysBefore: number;
    emailDelivery: boolean;
    smsDelivery: boolean;
  }
): Promise<Alert> {
  // Verify bill ownership
  const bill = await prisma.cashflowBill.findFirst({
    where: { id: data.billId, userId, deletedAt: null }
  });

  if (!bill) {
    throw new Error('Bill not found or access denied');
  }

  return await createAlert(userId, {
    alertType: 'upcoming_bill',
    name: data.name,
    sourceType: 'bill',
    sourceId: data.billId,
    conditions: {
      bill_id: data.billId.toString(),
      days_before: data.daysBefore
    },
    emailDelivery: data.emailDelivery,
    smsDelivery: data.smsDelivery
  });
}

// =============================================================================
// NOTIFICATION CRUD
// =============================================================================

/**
 * Get all notifications for a user
 */
export async function getAllNotifications(
  userId: bigint,
  options: { read?: boolean; limit?: number; offset?: number } = {}
): Promise<Notification[]> {
  const where: any = {
    userId,
    deletedAt: null
  };

  if (options.read !== undefined) {
    where.read = options.read;
  }

  return await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit,
    skip: options.offset
  });
}

/**
 * Get a specific notification by ID
 */
export async function getNotificationById(
  userId: bigint,
  notificationId: bigint
): Promise<Notification | null> {
  return await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
      deletedAt: null
    }
  });
}

/**
 * Create a notification
 */
export async function createNotification(
  userId: bigint,
  data: CreateNotificationData
): Promise<Notification> {
  // Get alert info for notification metadata
  let alertType = 'system';
  if (data.alertId) {
    const alert = await prisma.alert.findUnique({
      where: { id: data.alertId }
    });
    if (alert) {
      alertType = alert.alertType;
    }
  }

  return await prisma.notification.create({
    data: {
      userId,
      alertId: data.alertId || null,
      title: data.title,
      message: data.message,
      metadata: {
        ...(data.metadata || {}),
        alert_type: alertType
      },
      read: false
    }
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  userId: bigint,
  notificationId: bigint
): Promise<Notification | null> {
  const existing = await getNotificationById(userId, notificationId);
  if (!existing) {
    return null;
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: {
      read: true,
      readAt: new Date()
    }
  });
}

/**
 * Delete a notification (soft delete)
 */
export async function deleteNotification(
  userId: bigint,
  notificationId: bigint
): Promise<boolean> {
  const existing = await getNotificationById(userId, notificationId);
  if (!existing) {
    return false;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { deletedAt: new Date() }
  });

  return true;
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: bigint): Promise<number> {
  return await prisma.notification.count({
    where: {
      userId,
      read: false,
      deletedAt: null
    }
  });
}

// =============================================================================
// ALERT DESTINATION MANAGEMENT
// =============================================================================

/**
 * Get alert destinations from user preferences
 */
export async function getAlertDestinations(userId: bigint): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, preferences: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const prefs = (user.preferences as any) || {};

  return {
    email: user.email || null,
    sms: prefs.alertSmsNumber || null,
    email_verified: prefs.emailVerified || false,
    sms_verified: prefs.smsVerified || false
  };
}

/**
 * Update alert destinations
 */
export async function updateAlertDestinations(
  userId: bigint,
  data: { email?: string; sms?: string }
): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const prefs = (user.preferences as any) || {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.email && { email: data.email }),
      preferences: {
        ...prefs,
        ...(data.sms && { alertSmsNumber: data.sms }),
        ...(data.email && { emailVerified: false }), // Reset verification
        ...(data.sms && { smsVerified: false })
      }
    }
  });

  return await getAlertDestinations(userId);
}
