import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../src/config/auth';

describe('Goals API', () => {
  let authToken: string;
  let userId: string;
  let partnerId: string;
  let testAccountId: string;
  let payoffGoalId: string;
  let savingsGoalId: string;

  beforeAll(async () => {
    // Create test partner
    const partner = await prisma.partner.create({
      data: {
        name: 'Test Bank Goals',
        domain: 'testgoals.com',
      },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        partnerId: partner.id,
        email: 'goals@example.com',
        hashedPassword: 'hashed',
        firstName: 'Goal',
        lastName: 'Tester',
      },
    });

    userId = user.id.toString();
    partnerId = user.partnerId.toString();

    // Generate JWT
    authToken = jwt.sign(
      { userId, partnerId, email: user.email },
      authConfig.jwtSecret,
      { expiresIn: '24h' }
    );

    // Create test account
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        partnerId: partner.id,
        name: 'Test Credit Card',
        accountType: 'credit_card',
        balance: -1000,
      },
    });

    testAccountId = account.id.toString();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.goal.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.account.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.user.deleteMany({ where: { id: BigInt(userId) } });
    await prisma.partner.deleteMany({ where: { id: BigInt(partnerId) } });
  });

  describe('Payoff Goals', () => {
    describe('POST /users/:userId/payoff_goals', () => {
      it('should create a payoff goal', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/payoff_goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            payoff_goal: {
              name: 'Pay off credit card',
              current_value: '1000.00',
              account_id: testAccountId,
              target_completion_on: '2025-12-31',
              monthly_contribution: '100.00',
              image_url: 'https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg',
            },
          })
          .expect(201);

        expect(response.body).toHaveProperty('payoff_goal');
        expect(response.body.payoff_goal).toMatchObject({
          name: 'Pay off credit card',
          current_value: '1000.00',
          target_value: '0.00',
          monthly_contribution: '100.00',
          state: 'active',
        });

        payoffGoalId = response.body.payoff_goal.id;
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .post(`/api/v2/users/${userId}/payoff_goals`)
          .send({
            payoff_goal: {
              name: 'Test',
              current_value: '500.00',
              account_id: testAccountId,
            },
          })
          .expect(401);
      });

      it('should return 403 for mismatched userId', async () => {
        const otherUserId = '99999';
        await request(app)
          .post(`/api/v2/users/${otherUserId}/payoff_goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            payoff_goal: {
              name: 'Test',
              current_value: '500.00',
              account_id: testAccountId,
            },
          })
          .expect(403);
      });

      it('should return 400 for invalid data', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/payoff_goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            payoff_goal: {
              name: '', // Invalid: empty name
              current_value: 'invalid', // Invalid: not decimal format
            },
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /users/:userId/payoff_goals', () => {
      it('should list all payoff goals', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/payoff_goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('payoff_goals');
        expect(Array.isArray(response.body.payoff_goals)).toBe(true);
        expect(response.body.payoff_goals.length).toBeGreaterThan(0);
      });

      it('should exclude archived goals by default', async () => {
        // Archive a goal
        await prisma.goal.update({
          where: { id: BigInt(payoffGoalId) },
          data: { archivedAt: new Date() },
        });

        const response = await request(app)
          .get(`/api/v2/users/${userId}/payoff_goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const archivedGoal = response.body.payoff_goals.find((g: any) => g.id === payoffGoalId);
        expect(archivedGoal).toBeUndefined();

        // Unarchive for other tests
        await prisma.goal.update({
          where: { id: BigInt(payoffGoalId) },
          data: { archivedAt: null },
        });
      });

      it('should include archived goals when requested', async () => {
        // Archive a goal
        await prisma.goal.update({
          where: { id: BigInt(payoffGoalId) },
          data: { archivedAt: new Date() },
        });

        const response = await request(app)
          .get(`/api/v2/users/${userId}/payoff_goals?include_archived=true`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const archivedGoal = response.body.payoff_goals.find((g: any) => g.id === payoffGoalId);
        expect(archivedGoal).toBeDefined();
        expect(archivedGoal.state).toBe('archived');

        // Unarchive for other tests
        await prisma.goal.update({
          where: { id: BigInt(payoffGoalId) },
          data: { archivedAt: null },
        });
      });
    });

    describe('GET /users/:userId/payoff_goals/:id', () => {
      it('should get a single payoff goal', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/payoff_goals/${payoffGoalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('payoff_goal');
        expect(response.body.payoff_goal.id).toBe(payoffGoalId);
        expect(response.body.payoff_goal.name).toBe('Pay off credit card');
      });

      it('should return 404 for non-existent goal', async () => {
        await request(app)
          .get(`/api/v2/users/${userId}/payoff_goals/99999`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('PUT /users/:userId/payoff_goals/:id', () => {
      it('should update a payoff goal', async () => {
        const response = await request(app)
          .put(`/api/v2/users/${userId}/payoff_goals/${payoffGoalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            payoff_goal: {
              name: 'Updated payoff goal name',
              current_value: '750.00',
              monthly_contribution: '150.00',
            },
          })
          .expect(200);

        expect(response.body.payoff_goal.name).toBe('Updated payoff goal name');
        expect(response.body.payoff_goal.current_value).toBe('750.00');
        expect(response.body.payoff_goal.monthly_contribution).toBe('150.00');
      });

      it('should return 404 for non-existent goal', async () => {
        await request(app)
          .put(`/api/v2/users/${userId}/payoff_goals/99999`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            payoff_goal: {
              name: 'Test',
            },
          })
          .expect(404);
      });
    });

    describe('PUT /users/:userId/payoff_goals/:id/archive', () => {
      it('should archive a payoff goal', async () => {
        await request(app)
          .put(`/api/v2/users/${userId}/payoff_goals/${payoffGoalId}/archive`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify it's archived
        const goal = await prisma.goal.findUnique({
          where: { id: BigInt(payoffGoalId) },
        });
        expect(goal?.archivedAt).not.toBeNull();

        // Unarchive for other tests
        await prisma.goal.update({
          where: { id: BigInt(payoffGoalId) },
          data: { archivedAt: null },
        });
      });
    });

    describe('DELETE /users/:userId/payoff_goals/:id', () => {
      it('should delete a payoff goal', async () => {
        await request(app)
          .delete(`/api/v2/users/${userId}/payoff_goals/${payoffGoalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify it's soft deleted
        const goal = await prisma.goal.findUnique({
          where: { id: BigInt(payoffGoalId) },
        });
        expect(goal?.deletedAt).not.toBeNull();
      });

      it('should return 404 for non-existent goal', async () => {
        await request(app)
          .delete(`/api/v2/users/${userId}/payoff_goals/99999`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });
  });

  describe('Savings Goals', () => {
    describe('POST /users/:userId/savings_goals', () => {
      it('should create a savings goal', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/savings_goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            savings_goal: {
              name: 'Vacation fund',
              target_value: '5000.00',
              current_value: '1000.00',
              target_completion_on: '2025-08-01',
              monthly_contribution: '200.00',
              image_url: 'https://content.geezeo.com/images/savings_goal_images/vacation.jpg',
            },
          })
          .expect(201);

        expect(response.body).toHaveProperty('savings_goal');
        expect(response.body.savings_goal).toMatchObject({
          name: 'Vacation fund',
          target_value: '5000.00',
          current_value: '1000.00',
          monthly_contribution: '200.00',
          state: 'active',
        });

        savingsGoalId = response.body.savings_goal.id;
      });

      it('should create savings goal with account', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/savings_goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            savings_goal: {
              name: 'Emergency fund',
              target_value: '10000.00',
              account_id: testAccountId,
            },
          })
          .expect(201);

        expect(response.body.savings_goal.links.accounts).toContain(Number(testAccountId));

        // Clean up
        await prisma.goal.delete({
          where: { id: BigInt(response.body.savings_goal.id) },
        });
      });
    });

    describe('GET /users/:userId/savings_goals', () => {
      it('should list all savings goals', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/savings_goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('savings_goals');
        expect(Array.isArray(response.body.savings_goals)).toBe(true);
        expect(response.body.savings_goals.length).toBeGreaterThan(0);
      });
    });

    describe('GET /users/:userId/savings_goals/:id', () => {
      it('should get a single savings goal', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/savings_goals/${savingsGoalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('savings_goal');
        expect(response.body.savings_goal.id).toBe(savingsGoalId);
        expect(response.body.savings_goal.name).toBe('Vacation fund');
      });
    });

    describe('PUT /users/:userId/savings_goals/:id', () => {
      it('should update a savings goal', async () => {
        const response = await request(app)
          .put(`/api/v2/users/${userId}/savings_goals/${savingsGoalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            savings_goal: {
              name: 'Updated vacation fund',
              current_value: '2000.00',
            },
          })
          .expect(200);

        expect(response.body.savings_goal.name).toBe('Updated vacation fund');
        expect(response.body.savings_goal.current_value).toBe('2000.00');
      });
    });

    describe('PUT /users/:userId/savings_goals/:id/archive', () => {
      it('should archive a savings goal', async () => {
        await request(app)
          .put(`/api/v2/users/${userId}/savings_goals/${savingsGoalId}/archive`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify it's archived
        const goal = await prisma.goal.findUnique({
          where: { id: BigInt(savingsGoalId) },
        });
        expect(goal?.archivedAt).not.toBeNull();
      });
    });

    describe('DELETE /users/:userId/savings_goals/:id', () => {
      it('should delete a savings goal', async () => {
        await request(app)
          .delete(`/api/v2/users/${userId}/savings_goals/${savingsGoalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify it's soft deleted
        const goal = await prisma.goal.findUnique({
          where: { id: BigInt(savingsGoalId) },
        });
        expect(goal?.deletedAt).not.toBeNull();
      });
    });
  });

  describe('Goal Images', () => {
    describe('GET /payoff_goals', () => {
      it('should return payoff goal image options', async () => {
        const response = await request(app)
          .get('/api/v2/payoff_goals')
          .expect(200);

        expect(response.body).toHaveProperty('payoff_goals');
        expect(Array.isArray(response.body.payoff_goals)).toBe(true);
        expect(response.body.payoff_goals.length).toBeGreaterThan(0);
        expect(response.body.payoff_goals[0]).toHaveProperty('id');
        expect(response.body.payoff_goals[0]).toHaveProperty('name');
        expect(response.body.payoff_goals[0]).toHaveProperty('image_url');
      });
    });

    describe('GET /savings_goals', () => {
      it('should return savings goal image options', async () => {
        const response = await request(app)
          .get('/api/v2/savings_goals')
          .expect(200);

        expect(response.body).toHaveProperty('savings_goals');
        expect(Array.isArray(response.body.savings_goals)).toBe(true);
        expect(response.body.savings_goals.length).toBeGreaterThan(0);
        expect(response.body.savings_goals[0]).toHaveProperty('id');
        expect(response.body.savings_goals[0]).toHaveProperty('name');
        expect(response.body.savings_goals[0]).toHaveProperty('image_url');
      });
    });
  });
});
