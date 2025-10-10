import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../src/config/auth';

describe('Cashflow API', () => {
  let authToken: string;
  let userId: string;
  let partnerId: string;
  let testAccountId: string;
  let testBillId: string;
  let testIncomeId: string;
  let testEventId: string;

  beforeAll(async () => {
    // Create test partner
    const partner = await prisma.partner.create({
      data: {
        name: 'Test Bank Cashflow',
        domain: 'testcashflow.com',
      },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        partnerId: partner.id,
        email: 'cashflow@example.com',
        hashedPassword: 'hashed',
        firstName: 'Cashflow',
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
        name: 'Test Checking',
        accountType: 'checking',
        balance: 1000,
      },
    });

    testAccountId = account.id.toString();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.cashflowEvent.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.cashflowIncome.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.cashflowBill.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.account.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.user.deleteMany({ where: { id: BigInt(userId) } });
    await prisma.partner.deleteMany({ where: { id: BigInt(partnerId) } });
  });

  // =============================================================================
  // CASHFLOW SUMMARY TESTS
  // =============================================================================

  describe('GET /users/:userId/cashflow', () => {
    it('should get cashflow summary', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/cashflow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('cashflow');
      expect(response.body.cashflow).toHaveProperty('total_income');
      expect(response.body.cashflow).toHaveProperty('total_bills');
      expect(response.body.cashflow).toHaveProperty('net_cashflow');
      expect(response.body.cashflow).toHaveProperty('start_date');
      expect(response.body.cashflow).toHaveProperty('end_date');
      expect(response.body.cashflow).toHaveProperty('bills_count');
      expect(response.body.cashflow).toHaveProperty('incomes_count');
      expect(response.body.cashflow).toHaveProperty('events_count');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v2/users/${userId}/cashflow`)
        .expect(401);
    });
  });

  describe('PUT /users/:userId/cashflow', () => {
    it('should update cashflow settings', async () => {
      const response = await request(app)
        .put(`/api/v2/users/${userId}/cashflow`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          auto_categorize: true,
          show_projections: true,
          projection_days: 60
        })
        .expect(200);

      expect(response.body).toHaveProperty('cashflow');
    });
  });

  // =============================================================================
  // BILL TESTS
  // =============================================================================

  describe('Bills', () => {
    describe('POST /users/:userId/cashflow/bills', () => {
      it('should create a bill', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/cashflow/bills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Monthly Rent',
            amount: '1500.00',
            due_date: 1,
            recurrence: 'monthly',
            account_id: testAccountId
          })
          .expect(201);

        expect(response.body).toHaveProperty('bill');
        expect(response.body.bill).toMatchObject({
          name: 'Monthly Rent',
          amount: '1500.00',
          due_date: 1,
          recurrence: 'monthly',
          active: true
        });

        testBillId = response.body.bill.id;
      });

      it('should create bill with biweekly recurrence', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/cashflow/bills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Utility Bill',
            amount: '150.00',
            due_date: 15,
            recurrence: 'biweekly'
          })
          .expect(201);

        expect(response.body.bill.recurrence).toBe('biweekly');

        // Cleanup
        await prisma.cashflowBill.delete({
          where: { id: BigInt(response.body.bill.id) }
        });
      });

      it('should return 400 for invalid due date', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/cashflow/bills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Invalid Bill',
            amount: '100.00',
            due_date: 32, // Invalid: must be 1-31
            recurrence: 'monthly'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should return 400 for invalid amount format', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/cashflow/bills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Invalid Amount Bill',
            amount: 'not-a-number',
            due_date: 15,
            recurrence: 'monthly'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .post(`/api/v2/users/${userId}/cashflow/bills`)
          .send({
            name: 'Test Bill',
            amount: '50.00',
            due_date: 10
          })
          .expect(401);
      });
    });

    describe('GET /users/:userId/cashflow/bills', () => {
      it('should list all bills', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/cashflow/bills`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('bills');
        expect(Array.isArray(response.body.bills)).toBe(true);
        expect(response.body.bills.length).toBeGreaterThan(0);
      });

      it('should only return active bills by default', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/cashflow/bills`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.bills.forEach((bill: any) => {
          expect(bill.active).toBe(true);
        });
      });
    });

    describe('PUT /users/:userId/cashflow/bills/:id', () => {
      it('should update a bill', async () => {
        const response = await request(app)
          .put(`/api/v2/users/${userId}/cashflow/bills/${testBillId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Rent',
            amount: '1600.00',
            due_date: 5
          })
          .expect(200);

        expect(response.body.bill.name).toBe('Updated Rent');
        expect(response.body.bill.amount).toBe('1600.00');
        expect(response.body.bill.due_date).toBe(5);
      });

      it('should return 404 for non-existent bill', async () => {
        await request(app)
          .put(`/api/v2/users/${userId}/cashflow/bills/99999`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Name'
          })
          .expect(404);
      });
    });

    describe('PUT /users/:userId/cashflow/bills/:id/stop', () => {
      it('should stop a bill', async () => {
        const response = await request(app)
          .put(`/api/v2/users/${userId}/cashflow/bills/${testBillId}/stop`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.bill.active).toBe(false);
        expect(response.body.bill.stopped_at).not.toBeNull();
      });

      it('should return 404 for non-existent bill', async () => {
        await request(app)
          .put(`/api/v2/users/${userId}/cashflow/bills/99999/stop`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('DELETE /users/:userId/cashflow/bills/:id', () => {
      it('should delete a bill', async () => {
        await request(app)
          .delete(`/api/v2/users/${userId}/cashflow/bills/${testBillId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify it's soft deleted
        const bill = await prisma.cashflowBill.findUnique({
          where: { id: BigInt(testBillId) }
        });
        expect(bill?.deletedAt).not.toBeNull();
      });

      it('should return 404 for non-existent bill', async () => {
        await request(app)
          .delete(`/api/v2/users/${userId}/cashflow/bills/99999`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });
  });

  // =============================================================================
  // INCOME TESTS
  // =============================================================================

  describe('Incomes', () => {
    describe('POST /users/:userId/cashflow/incomes', () => {
      it('should create an income', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/cashflow/incomes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Monthly Salary',
            amount: '5000.00',
            receive_date: 1,
            recurrence: 'monthly',
            account_id: testAccountId
          })
          .expect(201);

        expect(response.body).toHaveProperty('income');
        expect(response.body.income).toMatchObject({
          name: 'Monthly Salary',
          amount: '5000.00',
          receive_date: 1,
          recurrence: 'monthly',
          active: true
        });

        testIncomeId = response.body.income.id;
      });

      it('should create income with weekly recurrence', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/cashflow/incomes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Freelance Work',
            amount: '500.00',
            receive_date: 5,
            recurrence: 'weekly'
          })
          .expect(201);

        expect(response.body.income.recurrence).toBe('weekly');

        // Cleanup
        await prisma.cashflowIncome.delete({
          where: { id: BigInt(response.body.income.id) }
        });
      });

      it('should return 400 for invalid receive date', async () => {
        const response = await request(app)
          .post(`/api/v2/users/${userId}/cashflow/incomes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Invalid Income',
            amount: '1000.00',
            receive_date: 0, // Invalid: must be 1-31
            recurrence: 'monthly'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /users/:userId/cashflow/incomes', () => {
      it('should list all incomes', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/cashflow/incomes`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('incomes');
        expect(Array.isArray(response.body.incomes)).toBe(true);
        expect(response.body.incomes.length).toBeGreaterThan(0);
      });
    });

    describe('PUT /users/:userId/cashflow/incomes/:id', () => {
      it('should update an income', async () => {
        const response = await request(app)
          .put(`/api/v2/users/${userId}/cashflow/incomes/${testIncomeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Salary',
            amount: '5500.00',
            receive_date: 15
          })
          .expect(200);

        expect(response.body.income.name).toBe('Updated Salary');
        expect(response.body.income.amount).toBe('5500.00');
        expect(response.body.income.receive_date).toBe(15);
      });

      it('should return 404 for non-existent income', async () => {
        await request(app)
          .put(`/api/v2/users/${userId}/cashflow/incomes/99999`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Name'
          })
          .expect(404);
      });
    });

    describe('PUT /users/:userId/cashflow/incomes/:id/stop', () => {
      it('should stop an income', async () => {
        const response = await request(app)
          .put(`/api/v2/users/${userId}/cashflow/incomes/${testIncomeId}/stop`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.income.active).toBe(false);
        expect(response.body.income.stopped_at).not.toBeNull();
      });
    });

    describe('DELETE /users/:userId/cashflow/incomes/:id', () => {
      it('should delete an income', async () => {
        await request(app)
          .delete(`/api/v2/users/${userId}/cashflow/incomes/${testIncomeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify it's soft deleted
        const income = await prisma.cashflowIncome.findUnique({
          where: { id: BigInt(testIncomeId) }
        });
        expect(income?.deletedAt).not.toBeNull();
      });
    });
  });

  // =============================================================================
  // EVENT TESTS
  // =============================================================================

  describe('Events', () => {
    beforeAll(async () => {
      // Create a bill for event projection
      const bill = await prisma.cashflowBill.create({
        data: {
          userId: BigInt(userId),
          name: 'Test Bill for Events',
          amount: 100,
          dueDate: 15,
          recurrence: 'monthly',
          active: true
        }
      });

      // Create an income for event projection
      await prisma.cashflowIncome.create({
        data: {
          userId: BigInt(userId),
          name: 'Test Income for Events',
          amount: 1000,
          receiveDate: 1,
          recurrence: 'monthly',
          active: true
        }
      });

      // Create a persisted event for testing updates
      const event = await prisma.cashflowEvent.create({
        data: {
          userId: BigInt(userId),
          sourceType: 'bill',
          sourceId: bill.id,
          name: 'Test Event',
          amount: 50,
          eventDate: new Date('2025-01-15'),
          eventType: 'expense',
          processed: false,
          metadata: {}
        }
      });

      testEventId = event.id.toString();
    });

    describe('GET /users/:userId/cashflow/events', () => {
      it('should list projected events', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/cashflow/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('events');
        expect(Array.isArray(response.body.events)).toBe(true);
        expect(response.body.events.length).toBeGreaterThan(0);

        // Verify event structure
        const event = response.body.events[0];
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('amount');
        expect(event).toHaveProperty('event_date');
        expect(event).toHaveProperty('event_type');
        expect(event).toHaveProperty('source_type');
      });

      it('should include both income and expense events', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/cashflow/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const hasIncome = response.body.events.some((e: any) => e.event_type === 'income');
        const hasExpense = response.body.events.some((e: any) => e.event_type === 'expense');

        expect(hasIncome).toBe(true);
        expect(hasExpense).toBe(true);
      });

      it('should return events in chronological order', async () => {
        const response = await request(app)
          .get(`/api/v2/users/${userId}/cashflow/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const dates = response.body.events.map((e: any) => new Date(e.event_date).getTime());
        const sortedDates = [...dates].sort((a, b) => a - b);

        expect(dates).toEqual(sortedDates);
      });
    });

    describe('PUT /users/:userId/cashflow/events/:id', () => {
      it('should update an event', async () => {
        const response = await request(app)
          .put(`/api/v2/users/${userId}/cashflow/events/${testEventId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Event',
            amount: '75.00',
            processed: true
          })
          .expect(200);

        expect(response.body.event.name).toBe('Updated Event');
        expect(response.body.event.amount).toBe('75.00');
        expect(response.body.event.processed).toBe(true);
      });

      it('should return 404 for non-existent event', async () => {
        await request(app)
          .put(`/api/v2/users/${userId}/cashflow/events/99999`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Name'
          })
          .expect(404);
      });
    });

    describe('DELETE /users/:userId/cashflow/events/:id', () => {
      it('should delete an event', async () => {
        await request(app)
          .delete(`/api/v2/users/${userId}/cashflow/events/${testEventId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify it's soft deleted
        const event = await prisma.cashflowEvent.findUnique({
          where: { id: BigInt(testEventId) }
        });
        expect(event?.deletedAt).not.toBeNull();
      });
    });
  });

  // =============================================================================
  // RECURRENCE LOGIC TESTS
  // =============================================================================

  describe('Recurrence Logic', () => {
    it('should project monthly bills correctly', async () => {
      // Create a monthly bill
      const bill = await prisma.cashflowBill.create({
        data: {
          userId: BigInt(userId),
          name: 'Monthly Test',
          amount: 200,
          dueDate: 10,
          recurrence: 'monthly',
          active: true
        }
      });

      const response = await request(app)
        .get(`/api/v2/users/${userId}/cashflow/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const billEvents = response.body.events.filter(
        (e: any) => e.source_id === Number(bill.id)
      );

      // Should have multiple occurrences within 90 days
      expect(billEvents.length).toBeGreaterThan(1);

      // Cleanup
      await prisma.cashflowBill.delete({ where: { id: bill.id } });
    });

    it('should handle biweekly recurrence', async () => {
      const bill = await prisma.cashflowBill.create({
        data: {
          userId: BigInt(userId),
          name: 'Biweekly Test',
          amount: 100,
          dueDate: 1,
          recurrence: 'biweekly',
          active: true
        }
      });

      const response = await request(app)
        .get(`/api/v2/users/${userId}/cashflow/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const billEvents = response.body.events.filter(
        (e: any) => e.source_id === Number(bill.id)
      );

      // Should have more occurrences than monthly (every 14 days)
      expect(billEvents.length).toBeGreaterThan(3);

      // Cleanup
      await prisma.cashflowBill.delete({ where: { id: bill.id } });
    });
  });

  // =============================================================================
  // CASHFLOW SUMMARY WITH DATA TESTS
  // =============================================================================

  describe('Cashflow Summary with Data', () => {
    beforeAll(async () => {
      // Create bills and incomes for summary testing
      await prisma.cashflowBill.create({
        data: {
          userId: BigInt(userId),
          name: 'Summary Bill 1',
          amount: 500,
          dueDate: 5,
          recurrence: 'monthly',
          active: true
        }
      });

      await prisma.cashflowIncome.create({
        data: {
          userId: BigInt(userId),
          name: 'Summary Income 1',
          amount: 3000,
          receiveDate: 1,
          recurrence: 'monthly',
          active: true
        }
      });
    });

    it('should calculate summary correctly', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/cashflow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const summary = response.body.cashflow;

      // Verify calculations
      expect(parseFloat(summary.total_bills)).toBeGreaterThan(0);
      expect(parseFloat(summary.total_income)).toBeGreaterThan(0);
      expect(parseFloat(summary.net_cashflow)).toBeDefined();
      expect(summary.bills_count).toBeGreaterThan(0);
      expect(summary.incomes_count).toBeGreaterThan(0);
      expect(summary.events_count).toBeGreaterThan(0);
    });

    it('should calculate averages correctly', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/cashflow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const summary = response.body.cashflow;

      expect(parseFloat(summary.average_bills)).toBeGreaterThan(0);
      expect(parseFloat(summary.average_income)).toBeGreaterThan(0);
    });
  });
});
