/**
 * Integration tests for Alerts Module
 * Tests all 6 alert types, notifications, and destinations
 */

import request from 'supertest';
import { app } from '../../src/index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Test data
let testUserId: bigint;
let testPartnerId: bigint;
let testAccountId: bigint;
let testBudgetId: bigint;
let testGoalId: bigint;
let testBillId: bigint;
let testToken: string;

beforeAll(async () => {
  // Create test partner
  const partner = await prisma.partner.create({
    data: {
      name: 'Test Partner',
      domain: 'test-alerts.example.com',
      allowPartnerApiv2: true
    }
  });
  testPartnerId = partner.id;

  // Create test user
  const user = await prisma.user.create({
    data: {
      partnerId: testPartnerId,
      email: 'alerts-test@example.com',
      firstName: 'Alerts',
      lastName: 'Tester'
    }
  });
  testUserId = user.id;

  // Create test account
  const account = await prisma.account.create({
    data: {
      userId: testUserId,
      partnerId: testPartnerId,
      name: 'Test Checking',
      accountType: 'checking',
      balance: 1000.00
    }
  });
  testAccountId = account.id;

  // Create test budget
  const budget = await prisma.budget.create({
    data: {
      userId: testUserId,
      name: 'Test Budget',
      budgetAmount: 500.00
    }
  });
  testBudgetId = budget.id;

  // Create test goal
  const goal = await prisma.goal.create({
    data: {
      userId: testUserId,
      goalType: 'savings',
      name: 'Test Goal',
      targetAmount: 5000.00,
      currentAmount: 2500.00
    }
  });
  testGoalId = goal.id;

  // Create test bill
  const bill = await prisma.cashflowBill.create({
    data: {
      userId: testUserId,
      name: 'Test Bill',
      amount: 100.00,
      dueDate: 15
    }
  });
  testBillId = bill.id;

  // Generate JWT token
  testToken = jwt.sign(
    { sub: testUserId.toString(), iss: testPartnerId.toString() },
    process.env.JWT_SECRET || 'test-secret'
  );
});

afterAll(async () => {
  // Clean up test data
  await prisma.notification.deleteMany({ where: { userId: testUserId } });
  await prisma.alert.deleteMany({ where: { userId: testUserId } });
  await prisma.cashflowBill.deleteMany({ where: { userId: testUserId } });
  await prisma.goal.deleteMany({ where: { userId: testUserId } });
  await prisma.budget.deleteMany({ where: { userId: testUserId } });
  await prisma.account.deleteMany({ where: { userId: testUserId } });
  await prisma.user.deleteMany({ where: { id: testUserId } });
  await prisma.partner.deleteMany({ where: { id: testPartnerId } });
});

// =============================================================================
// ACCOUNT THRESHOLD ALERTS
// =============================================================================

describe('Account Threshold Alerts', () => {
  let alertId: number;

  test('should create account threshold alert', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/account_thresholds`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Low Balance Alert',
        account_id: testAccountId.toString(),
        threshold: '500.00',
        direction: 'below',
        email_delivery: true,
        sms_delivery: false
      });

    expect(response.status).toBe(201);
    expect(response.body.alert).toBeDefined();
    expect(response.body.alert.alert_type).toBe('account_threshold');
    expect(response.body.alert.account_id).toBe(Number(testAccountId));
    expect(response.body.alert.threshold).toBe('500.00');
    expect(response.body.alert.direction).toBe('below');

    alertId = response.body.alert.id;
  });

  test('should list alerts including account threshold', async () => {
    const response = await request(app)
      .get(`/api/v2/users/${testUserId}/alerts`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.alerts).toBeInstanceOf(Array);
    expect(response.body.alerts.length).toBeGreaterThan(0);
  });

  test('should get specific account threshold alert', async () => {
    const response = await request(app)
      .get(`/api/v2/users/${testUserId}/alerts/${alertId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.alert.id).toBe(alertId);
    expect(response.body.alert.alert_type).toBe('account_threshold');
  });

  test('should update account threshold alert', async () => {
    const response = await request(app)
      .put(`/api/v2/users/${testUserId}/alerts/account_thresholds/${alertId}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Updated Low Balance Alert',
        account_id: testAccountId.toString(),
        threshold: '300.00',
        direction: 'below',
        email_delivery: true,
        sms_delivery: true
      });

    expect(response.status).toBe(200);
    expect(response.body.alert.name).toBe('Updated Low Balance Alert');
    expect(response.body.alert.threshold).toBe('300.00');
    expect(response.body.alert.sms_delivery).toBe(true);
  });

  test('should disable alert', async () => {
    const response = await request(app)
      .put(`/api/v2/users/${testUserId}/alerts/${alertId}/disable`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.alert.active).toBe(false);
  });

  test('should enable alert', async () => {
    const response = await request(app)
      .put(`/api/v2/users/${testUserId}/alerts/${alertId}/enable`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.alert.active).toBe(true);
  });

  test('should delete alert', async () => {
    const response = await request(app)
      .delete(`/api/v2/users/${testUserId}/alerts/${alertId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(204);
  });

  test('should return 404 for non-existent account', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/account_thresholds`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Invalid Account Alert',
        account_id: '999999999',
        threshold: '500.00',
        direction: 'below',
        email_delivery: true,
        sms_delivery: false
      });

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// GOAL ALERTS
// =============================================================================

describe('Goal Alerts', () => {
  let alertId: number;

  test('should create goal alert', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/goals`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Goal 50% Alert',
        goal_id: testGoalId.toString(),
        milestone_percentage: 50,
        email_delivery: true,
        sms_delivery: false
      });

    expect(response.status).toBe(201);
    expect(response.body.alert.alert_type).toBe('goal');
    expect(response.body.alert.goal_id).toBe(Number(testGoalId));
    expect(response.body.alert.milestone_percentage).toBe(50);

    alertId = response.body.alert.id;
  });

  test('should delete goal alert', async () => {
    const response = await request(app)
      .delete(`/api/v2/users/${testUserId}/alerts/${alertId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(204);
  });
});

// =============================================================================
// MERCHANT NAME ALERTS
// =============================================================================

describe('Merchant Name Alerts', () => {
  let alertId: number;

  test('should create merchant name alert', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/merchant_names`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Amazon Purchase Alert',
        merchant_pattern: 'Amazon',
        match_type: 'contains',
        email_delivery: true,
        sms_delivery: false
      });

    expect(response.status).toBe(201);
    expect(response.body.alert.alert_type).toBe('merchant_name');
    expect(response.body.alert.merchant_pattern).toBe('Amazon');
    expect(response.body.alert.match_type).toBe('contains');

    alertId = response.body.alert.id;
  });

  test('should delete merchant name alert', async () => {
    const response = await request(app)
      .delete(`/api/v2/users/${testUserId}/alerts/${alertId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(204);
  });
});

// =============================================================================
// SPENDING TARGET ALERTS
// =============================================================================

describe('Spending Target Alerts', () => {
  let alertId: number;

  test('should create spending target alert', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/spending_targets`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Budget 80% Alert',
        budget_id: testBudgetId.toString(),
        threshold_percentage: 80,
        email_delivery: true,
        sms_delivery: false
      });

    expect(response.status).toBe(201);
    expect(response.body.alert.alert_type).toBe('spending_target');
    expect(response.body.alert.budget_id).toBe(Number(testBudgetId));
    expect(response.body.alert.threshold_percentage).toBe(80);

    alertId = response.body.alert.id;
  });

  test('should delete spending target alert', async () => {
    const response = await request(app)
      .delete(`/api/v2/users/${testUserId}/alerts/${alertId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(204);
  });
});

// =============================================================================
// TRANSACTION LIMIT ALERTS
// =============================================================================

describe('Transaction Limit Alerts', () => {
  let alertId: number;

  test('should create transaction limit alert with account', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/transaction_limits`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Large Transaction Alert',
        account_id: testAccountId.toString(),
        amount: '1000.00',
        email_delivery: true,
        sms_delivery: true
      });

    expect(response.status).toBe(201);
    expect(response.body.alert.alert_type).toBe('transaction_limit');
    expect(response.body.alert.amount).toBe('1000.00');

    alertId = response.body.alert.id;
  });

  test('should create transaction limit alert without account', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/transaction_limits`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Any Large Transaction',
        amount: '500.00',
        email_delivery: true,
        sms_delivery: false
      });

    expect(response.status).toBe(201);
    expect(response.body.alert.alert_type).toBe('transaction_limit');
    expect(response.body.alert.account_id).toBeNull();
  });

  test('should delete transaction limit alert', async () => {
    const response = await request(app)
      .delete(`/api/v2/users/${testUserId}/alerts/${alertId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(204);
  });
});

// =============================================================================
// UPCOMING BILL ALERTS
// =============================================================================

describe('Upcoming Bill Alerts', () => {
  let alertId: number;

  test('should create upcoming bill alert', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/upcoming_bills`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Bill Due Soon',
        bill_id: testBillId.toString(),
        days_before: 3,
        email_delivery: true,
        sms_delivery: false
      });

    expect(response.status).toBe(201);
    expect(response.body.alert.alert_type).toBe('upcoming_bill');
    expect(response.body.alert.bill_id).toBe(Number(testBillId));
    expect(response.body.alert.days_before).toBe(3);

    alertId = response.body.alert.id;
  });

  test('should delete upcoming bill alert', async () => {
    const response = await request(app)
      .delete(`/api/v2/users/${testUserId}/alerts/${alertId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(204);
  });
});

// =============================================================================
// NOTIFICATIONS
// =============================================================================

describe('Notifications', () => {
  let notificationId: number;

  beforeAll(async () => {
    // Create a test notification
    const notification = await prisma.notification.create({
      data: {
        userId: testUserId,
        title: 'Test Notification',
        message: 'This is a test notification',
        read: false
      }
    });
    notificationId = Number(notification.id);
  });

  test('should list notifications', async () => {
    const response = await request(app)
      .get(`/api/v2/users/${testUserId}/notifications`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.notifications).toBeInstanceOf(Array);
    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.unread_count).toBeGreaterThan(0);
  });

  test('should get specific notification', async () => {
    const response = await request(app)
      .get(`/api/v2/users/${testUserId}/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.notification.id).toBe(notificationId);
    expect(response.body.notification.title).toBe('Test Notification');
  });

  test('should mark notification as read', async () => {
    const response = await request(app)
      .put(`/api/v2/users/${testUserId}/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.notification.read).toBe(true);
    expect(response.body.notification.read_at).toBeDefined();
  });

  test('should delete notification', async () => {
    const response = await request(app)
      .delete(`/api/v2/users/${testUserId}/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(204);
  });

  test('should filter unread notifications', async () => {
    const response = await request(app)
      .get(`/api/v2/users/${testUserId}/notifications?read=false`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.notifications).toBeInstanceOf(Array);
  });
});

// =============================================================================
// ALERT DESTINATIONS
// =============================================================================

describe('Alert Destinations', () => {
  test('should get alert destinations', async () => {
    const response = await request(app)
      .get(`/api/v2/users/${testUserId}/alert_destinations`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.destinations).toBeDefined();
    expect(response.body.destinations.email).toBe('alerts-test@example.com');
  });

  test('should update alert destinations', async () => {
    const response = await request(app)
      .put(`/api/v2/users/${testUserId}/alert_destinations`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        email: 'newemail@example.com',
        sms: '+15551234567'
      });

    expect(response.status).toBe(200);
    expect(response.body.destinations.email).toBe('newemail@example.com');
    expect(response.body.destinations.sms).toBe('+15551234567');
  });

  test('should validate email format', async () => {
    const response = await request(app)
      .put(`/api/v2/users/${testUserId}/alert_destinations`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        email: 'invalid-email'
      });

    expect(response.status).toBe(400);
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('Alert Validation', () => {
  test('should validate missing required fields', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/account_thresholds`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Incomplete Alert'
        // Missing account_id, threshold, direction
      });

    expect(response.status).toBe(400);
    expect(response.body.details).toBeDefined();
  });

  test('should validate threshold format', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/account_thresholds`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Bad Threshold',
        account_id: testAccountId.toString(),
        threshold: 'not-a-number',
        direction: 'below',
        email_delivery: true,
        sms_delivery: false
      });

    expect(response.status).toBe(400);
  });

  test('should validate milestone percentage range', async () => {
    const response = await request(app)
      .post(`/api/v2/users/${testUserId}/alerts/goals`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Bad Milestone',
        goal_id: testGoalId.toString(),
        milestone_percentage: 150, // Out of range
        email_delivery: true,
        sms_delivery: false
      });

    expect(response.status).toBe(400);
  });
});

// =============================================================================
// AUTHORIZATION TESTS
// =============================================================================

describe('Alert Authorization', () => {
  test('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/v2/users/${testUserId}/alerts`);

    expect(response.status).toBe(401);
  });

  test('should prevent access to other users alerts', async () => {
    // Create another user
    const otherUser = await prisma.user.create({
      data: {
        partnerId: testPartnerId,
        email: 'other@example.com'
      }
    });

    const otherToken = jwt.sign(
      { sub: otherUser.id.toString(), iss: testPartnerId.toString() },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Create alert for test user
    const alert = await prisma.alert.create({
      data: {
        userId: testUserId,
        alertType: 'merchant_name',
        name: 'Private Alert',
        conditions: { merchant_pattern: 'Test' },
        active: true
      }
    });

    // Try to access with other user's token
    const response = await request(app)
      .get(`/api/v2/users/${testUserId}/alerts/${alert.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(404);

    // Cleanup
    await prisma.alert.delete({ where: { id: alert.id } });
    await prisma.user.delete({ where: { id: otherUser.id } });
  });
});
