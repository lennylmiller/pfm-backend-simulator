/**
 * Alert Routes
 * All alert, notification, and destination endpoints
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as alertsController from '../controllers/alertsController';

const router = Router();

// =============================================================================
// GENERIC ALERT ENDPOINTS
// =============================================================================

// List all alerts
router.get('/users/:userId/alerts', authenticateJWT, alertsController.listAlerts);

// Get specific alert
router.get('/users/:userId/alerts/:id', authenticateJWT, alertsController.getAlert);

// Update alert
router.put('/users/:userId/alerts/:id', authenticateJWT, alertsController.updateAlert);

// Delete alert
router.delete('/users/:userId/alerts/:id', authenticateJWT, alertsController.deleteAlert);

// Enable alert
router.put('/users/:userId/alerts/:id/enable', authenticateJWT, alertsController.enableAlert);

// Disable alert
router.put('/users/:userId/alerts/:id/disable', authenticateJWT, alertsController.disableAlert);

// =============================================================================
// TYPE-SPECIFIC ALERT CREATION ENDPOINTS
// =============================================================================

// Account threshold alerts
router.post(
  '/users/:userId/alerts/account_thresholds',
  authenticateJWT,
  alertsController.createAccountThresholdAlert
);

router.put(
  '/users/:userId/alerts/account_thresholds/:id',
  authenticateJWT,
  alertsController.updateAccountThresholdAlert
);

// Goal alerts
router.post('/users/:userId/alerts/goals', authenticateJWT, alertsController.createGoalAlert);

// Merchant name alerts
router.post(
  '/users/:userId/alerts/merchant_names',
  authenticateJWT,
  alertsController.createMerchantNameAlert
);

// Spending target alerts
router.post(
  '/users/:userId/alerts/spending_targets',
  authenticateJWT,
  alertsController.createSpendingTargetAlert
);

// Transaction limit alerts
router.post(
  '/users/:userId/alerts/transaction_limits',
  authenticateJWT,
  alertsController.createTransactionLimitAlert
);

// Upcoming bill alerts
router.post(
  '/users/:userId/alerts/upcoming_bills',
  authenticateJWT,
  alertsController.createUpcomingBillAlert
);

// =============================================================================
// NOTIFICATION ENDPOINTS
// =============================================================================

// List notifications
router.get('/users/:userId/notifications', authenticateJWT, alertsController.listNotifications);

// Get specific notification
router.get('/users/:userId/notifications/:id', authenticateJWT, alertsController.getNotification);

// Mark notification as read
router.put(
  '/users/:userId/notifications/:id/read',
  authenticateJWT,
  alertsController.markNotificationRead
);

// Delete notification
router.delete(
  '/users/:userId/notifications/:id',
  authenticateJWT,
  alertsController.deleteNotification
);

// =============================================================================
// ALERT DESTINATION ENDPOINTS
// =============================================================================

// Get alert destinations
router.get(
  '/users/:userId/alert_destinations',
  authenticateJWT,
  alertsController.getAlertDestinations
);

// Update alert destinations
router.put(
  '/users/:userId/alert_destinations',
  authenticateJWT,
  alertsController.updateAlertDestinations
);

export default router;
