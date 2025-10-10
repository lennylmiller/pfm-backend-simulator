/**
 * Alerts Controller
 * HTTP handlers for alert management, notifications, and destinations
 */

import { Request, Response } from 'express';
import * as alertService from '../services/alertService';
import {
  validateAccountThresholdAlert,
  validateGoalAlert,
  validateMerchantNameAlert,
  validateSpendingTargetAlert,
  validateTransactionLimitAlert,
  validateUpcomingBillAlert,
  validateAlertUpdate,
  validateAlertDestination,
} from '../validators/alertSchemas';
import { serializeAlert, serializeNotification } from '../utils/serializers';
import { AuthContext } from '../types/auth';

interface AuthenticatedRequest extends Request {
  context?: AuthContext;
}


// =============================================================================
// GENERIC ALERT ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/users/:userId/alerts
 * List all alerts for a user
 */
export async function listAlerts(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const includeInactive = req.query.include_inactive === 'true';

    const alerts = await alertService.getAllAlerts(userId, { includeInactive });
    res.json({ alerts: alerts.map(serializeAlert) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v2/users/:userId/alerts/:id
 * Get a specific alert by ID
 */
export async function getAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const alertId = BigInt(req.params.id);

    const alert = await alertService.getAlertById(userId, alertId);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    res.json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/v2/users/:userId/alerts/:id
 * Update an alert
 */
export async function updateAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const alertId = BigInt(req.params.id);
    const validated = validateAlertUpdate(req.body.alert || req.body);

    const alert = await alertService.updateAlert(userId, alertId, validated);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    res.json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * DELETE /api/v2/users/:userId/alerts/:id
 * Delete an alert (soft delete)
 */
export async function deleteAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const alertId = BigInt(req.params.id);

    const deleted = await alertService.deleteAlert(userId, alertId);

    if (!deleted) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/v2/users/:userId/alerts/:id/enable
 * Enable an alert
 */
export async function enableAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const alertId = BigInt(req.params.id);

    const alert = await alertService.enableAlert(userId, alertId);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    res.json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/v2/users/:userId/alerts/:id/disable
 * Disable an alert
 */
export async function disableAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const alertId = BigInt(req.params.id);

    const alert = await alertService.disableAlert(userId, alertId);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    res.json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =============================================================================
// ACCOUNT THRESHOLD ALERT
// =============================================================================

/**
 * POST /api/v2/users/:userId/alerts/account_thresholds
 * Create account threshold alert
 */
export async function createAccountThresholdAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const validated = validateAccountThresholdAlert(req.body.alert || req.body);

    const alert = await alertService.createAccountThresholdAlert(userId, {
      name: validated.name,
      accountId: validated.account_id,
      threshold: validated.threshold,
      direction: validated.direction,
      emailDelivery: validated.email_delivery,
      smsDelivery: validated.sms_delivery,
    });

    res.status(201).json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * PUT /api/v2/users/:userId/alerts/account_thresholds/:id
 * Update account threshold alert
 */
export async function updateAccountThresholdAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const alertId = BigInt(req.params.id);
    const validated = validateAccountThresholdAlert(req.body.alert || req.body);

    const alert = await alertService.updateAlert(userId, alertId, {
      name: validated.name,
      conditions: {
        account_id: validated.account_id.toString(),
        threshold: validated.threshold,
        direction: validated.direction,
      },
      emailDelivery: validated.email_delivery,
      smsDelivery: validated.sms_delivery,
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    res.json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

// =============================================================================
// GOAL ALERT
// =============================================================================

/**
 * POST /api/v2/users/:userId/alerts/goals
 * Create goal alert
 */
export async function createGoalAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const validated = validateGoalAlert(req.body.alert || req.body);

    const alert = await alertService.createGoalAlert(userId, {
      name: validated.name,
      goalId: validated.goal_id,
      milestonePercentage: validated.milestone_percentage,
      emailDelivery: validated.email_delivery,
      smsDelivery: validated.sms_delivery,
    });

    res.status(201).json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

// =============================================================================
// MERCHANT NAME ALERT
// =============================================================================

/**
 * POST /api/v2/users/:userId/alerts/merchant_names
 * Create merchant name alert
 */
export async function createMerchantNameAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const validated = validateMerchantNameAlert(req.body.alert || req.body);

    const alert = await alertService.createMerchantNameAlert(userId, {
      name: validated.name,
      merchantPattern: validated.merchant_pattern,
      matchType: validated.match_type,
      emailDelivery: validated.email_delivery,
      smsDelivery: validated.sms_delivery,
    });

    res.status(201).json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

// =============================================================================
// SPENDING TARGET ALERT
// =============================================================================

/**
 * POST /api/v2/users/:userId/alerts/spending_targets
 * Create spending target alert
 */
export async function createSpendingTargetAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const validated = validateSpendingTargetAlert(req.body.alert || req.body);

    const alert = await alertService.createSpendingTargetAlert(userId, {
      name: validated.name,
      budgetId: validated.budget_id,
      thresholdPercentage: validated.threshold_percentage,
      emailDelivery: validated.email_delivery,
      smsDelivery: validated.sms_delivery,
    });

    res.status(201).json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

// =============================================================================
// TRANSACTION LIMIT ALERT
// =============================================================================

/**
 * POST /api/v2/users/:userId/alerts/transaction_limits
 * Create transaction limit alert
 */
export async function createTransactionLimitAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const validated = validateTransactionLimitAlert(req.body.alert || req.body);

    const alert = await alertService.createTransactionLimitAlert(userId, {
      name: validated.name,
      accountId: validated.account_id,
      amount: validated.amount,
      emailDelivery: validated.email_delivery,
      smsDelivery: validated.sms_delivery,
    });

    res.status(201).json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

// =============================================================================
// UPCOMING BILL ALERT
// =============================================================================

/**
 * POST /api/v2/users/:userId/alerts/upcoming_bills
 * Create upcoming bill alert
 */
export async function createUpcomingBillAlert(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const validated = validateUpcomingBillAlert(req.body.alert || req.body);

    const alert = await alertService.createUpcomingBillAlert(userId, {
      name: validated.name,
      billId: validated.bill_id,
      daysBefore: validated.days_before,
      emailDelivery: validated.email_delivery,
      smsDelivery: validated.sms_delivery,
    });

    res.status(201).json({ alert: serializeAlert(alert) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * GET /api/v2/users/:userId/notifications
 * List all notifications for a user
 */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const read = req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 25;

    const notifications = await alertService.getAllNotifications(userId, {
      read,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    const unreadCount = await alertService.getUnreadNotificationCount(userId);

    res.json({
      notifications: notifications.map(serializeNotification),
      meta: {
        current_page: page,
        per_page: perPage,
        unread_count: unreadCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v2/users/:userId/notifications/:id
 * Get a specific notification
 */
export async function getNotification(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const notificationId = BigInt(req.params.id);

    const notification = await alertService.getNotificationById(userId, notificationId);

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ notification: serializeNotification(notification) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/v2/users/:userId/notifications/:id/read
 * Mark notification as read
 */
export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const notificationId = BigInt(req.params.id);

    const notification = await alertService.markNotificationAsRead(userId, notificationId);

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ notification: serializeNotification(notification) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/v2/users/:userId/notifications/:id
 * Delete a notification
 */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const notificationId = BigInt(req.params.id);

    const deleted = await alertService.deleteNotification(userId, notificationId);

    if (!deleted) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =============================================================================
// ALERT DESTINATIONS
// =============================================================================

/**
 * GET /api/v2/users/:userId/alert_destinations
 * Get alert destinations
 */
export async function getAlertDestinations(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const destinations = await alertService.getAlertDestinations(userId);
    res.json({ destinations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/v2/users/:userId/alert_destinations
 * Update alert destinations
 */
export async function updateAlertDestinations(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = BigInt(authReq.context!.userId);
    const validated = validateAlertDestination(req.body.destinations || req.body);

    const destinations = await alertService.updateAlertDestinations(userId, {
      email: validated.email,
      sms: validated.sms,
    });

    res.json({ destinations });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}
