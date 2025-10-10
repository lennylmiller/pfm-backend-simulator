import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { startOfMonth, endOfMonth, subMonths, subDays, format } from 'date-fns';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Expenses API', () => {
  let testUserId: bigint;
  let testPartnerId: bigint;
  let testAccountId: bigint;
  let testTagId1: bigint;
  let testTagId2: bigint;
  let authToken: string;

  beforeAll(async () => {
    // Create test partner
    const partner = await prisma.partner.create({
      data: {
        name: 'Test Bank',
        domain: 'testbank.com'
      }
    });
    testPartnerId = partner.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        partnerId: testPartnerId,
        email: 'expenses-test@example.com',
        firstName: 'Expense',
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
        balance: 5000
      }
    });
    testAccountId = account.id;

    // Create test tags
    const tag1 = await prisma.tag.create({
      data: {
        name: 'Groceries',
        tagType: 'system'
      }
    });
    testTagId1 = tag1.id;

    const tag2 = await prisma.tag.create({
      data: {
        name: 'Dining',
        tagType: 'system'
      }
    });
    testTagId2 = tag2.id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUserId.toString(), partnerId: testPartnerId.toString() },
      JWT_SECRET
    );
  });

  beforeEach(async () => {
    // Clean up transactions before each test
    await prisma.transaction.deleteMany({
      where: { userId: testUserId }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.account.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.tag.deleteMany({ where: { id: { in: [testTagId1, testTagId2] } } });
    await prisma.partner.deleteMany({ where: { id: testPartnerId } });
    await prisma.$disconnect();
  });

  describe('GET /users/:userId/expenses', () => {
    it('should return this month expenses summary', async () => {
      // Create transactions for this month
      const now = new Date();
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Grocery Store',
            merchantName: 'Safeway',
            transactionType: 'debit',
            postedAt: now,
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Restaurant',
            merchantName: 'Pizza Place',
            transactionType: 'debit',
            postedAt: now,
            primaryTagId: testTagId2
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'this_month' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('expenses');
      expect(response.body.expenses.total).toBe('80.00');
      expect(response.body.expenses.count).toBe(2);
      expect(response.body.expenses.period).toBe('this_month');
    });

    it('should return last month expenses summary', async () => {
      // Create transactions for last month
      const lastMonth = subMonths(new Date(), 1);
      const lastMonthDate = new Date(
        lastMonth.getFullYear(),
        lastMonth.getMonth(),
        15
      );

      await prisma.transaction.create({
        data: {
          userId: testUserId,
          accountId: testAccountId,
          amount: -100.00,
          description: 'Grocery Store',
          transactionType: 'debit',
          postedAt: lastMonthDate,
          primaryTagId: testTagId1
        }
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'last_month' });

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('100.00');
      expect(response.body.expenses.period).toBe('last_month');
    });

    it('should return last 30 days expenses', async () => {
      // Create transactions in last 30 days
      const date1 = subDays(new Date(), 5);
      const date2 = subDays(new Date(), 15);

      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -25.00,
            description: 'Store',
            transactionType: 'debit',
            postedAt: date1,
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -15.00,
            description: 'Cafe',
            transactionType: 'debit',
            postedAt: date2,
            primaryTagId: testTagId2
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'last_thirty_days' });

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('40.00');
    });

    it('should return custom date range expenses', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-15');

      await prisma.transaction.create({
        data: {
          userId: testUserId,
          accountId: testAccountId,
          amount: -75.00,
          description: 'Store',
          transactionType: 'debit',
          postedAt: new Date('2025-10-10'),
          primaryTagId: testTagId1
        }
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: 'custom',
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd')
        });

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('75.00');
    });

    it('should group by category', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Grocery',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Restaurant',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId2
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'this_month', group_by: 'category' });

      expect(response.status).toBe(200);
      expect(response.body.expenses.categories).toHaveLength(2);
      expect(response.body.expenses.categories[0]).toHaveProperty('tag_name');
      expect(response.body.expenses.categories[0]).toHaveProperty('percent_of_total');
    });

    it('should group by merchant', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Store',
            merchantName: 'Safeway',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Restaurant',
            merchantName: 'Pizza Hut',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId2
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'this_month', group_by: 'merchant' });

      expect(response.status).toBe(200);
      expect(response.body.expenses.categories).toHaveLength(2);
    });

    it('should filter by included tags', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Grocery',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Restaurant',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId2
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: 'this_month',
          include_tags: testTagId1.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('50.00');
      expect(response.body.expenses.count).toBe(1);
    });

    it('should filter by excluded tags', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Grocery',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Restaurant',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId2
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: 'this_month',
          exclude_tags: testTagId1.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('30.00');
      expect(response.body.expenses.count).toBe(1);
    });

    it('should calculate percentages correctly', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -75.00,
            description: 'Grocery',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -25.00,
            description: 'Restaurant',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId2
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'this_month' });

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('100.00');

      const categories = response.body.expenses.categories;
      expect(categories[0].percent_of_total).toBe(75);
      expect(categories[1].percent_of_total).toBe(25);
    });
  });

  describe('GET /users/:userId/expenses/categories', () => {
    it('should return category breakdown', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Grocery',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Restaurant',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId2
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/categories`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('categories');
      expect(response.body.categories).toHaveLength(2);
      expect(response.body.categories[0]).toHaveProperty('tag_name');
      expect(response.body.categories[0]).toHaveProperty('amount');
      expect(response.body.categories[0]).toHaveProperty('transaction_count');
    });

    it('should sort by total descending', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Restaurant',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId2
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Grocery',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/categories`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const amounts = response.body.categories.map((c: any) => parseFloat(c.amount));
      expect(amounts[0]).toBeGreaterThanOrEqual(amounts[1]);
    });
  });

  describe('GET /users/:userId/expenses/merchants', () => {
    it('should return top merchants', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Store',
            merchantName: 'Safeway',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Restaurant',
            merchantName: 'Pizza Hut',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId2
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/merchants`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('merchants');
      expect(response.body.merchants).toHaveLength(2);
      expect(response.body.merchants[0]).toHaveProperty('merchant');
      expect(response.body.merchants[0]).toHaveProperty('last_transaction_date');
    });

    it('should limit results', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            merchantName: 'Merchant1',
            transactionType: 'debit',
            postedAt: new Date()
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -40.00,
            merchantName: 'Merchant2',
            transactionType: 'debit',
            postedAt: new Date()
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            merchantName: 'Merchant3',
            transactionType: 'debit',
            postedAt: new Date()
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/merchants`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.merchants).toHaveLength(2);
    });
  });

  describe('GET /users/:userId/expenses/tags/:tagId', () => {
    it('should return expenses for specific tag', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Grocery 1',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Grocery 2',
            transactionType: 'debit',
            postedAt: new Date(),
            primaryTagId: testTagId1
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/tags/${testTagId1}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tag_expenses');
      expect(response.body.tag_expenses.total).toBe('80.00');
      expect(response.body.tag_expenses.count).toBe(2);
      expect(response.body.tag_expenses.transactions).toHaveLength(2);
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/tags/999999`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /users/:userId/expenses/trends', () => {
    it('should return monthly trends', async () => {
      // Create transactions across different months
      const thisMonth = new Date();
      const lastMonth = subMonths(thisMonth, 1);

      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -100.00,
            description: 'This month',
            transactionType: 'debit',
            postedAt: thisMonth
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -75.00,
            description: 'Last month',
            transactionType: 'debit',
            postedAt: lastMonth
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/trends`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trends');
      expect(response.body.trends.length).toBe(6); // Default 6 months
      expect(response.body.trends[0]).toHaveProperty('month');
      expect(response.body.trends[0]).toHaveProperty('year');
      expect(response.body.trends[0]).toHaveProperty('total');
    });

    it('should support custom month count', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/trends`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ months: 3 });

      expect(response.status).toBe(200);
      expect(response.body.trends).toHaveLength(3);
    });
  });

  describe('GET /users/:userId/expenses/comparison', () => {
    it('should compare this month vs last month', async () => {
      const thisMonth = new Date();
      const lastMonth = subMonths(thisMonth, 1);

      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -100.00,
            description: 'This month',
            transactionType: 'debit',
            postedAt: thisMonth
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -75.00,
            description: 'Last month',
            transactionType: 'debit',
            postedAt: lastMonth
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/comparison`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('comparison');
      expect(response.body.comparison).toHaveProperty('this_month');
      expect(response.body.comparison).toHaveProperty('last_month');
      expect(response.body.comparison).toHaveProperty('difference');
      expect(response.body.comparison).toHaveProperty('percentage_change');
    });

    it('should handle increase and decrease', async () => {
      const thisMonth = new Date();
      const lastMonth = subMonths(thisMonth, 1);

      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -150.00,
            description: 'This month',
            transactionType: 'debit',
            postedAt: thisMonth
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -100.00,
            description: 'Last month',
            transactionType: 'debit',
            postedAt: lastMonth
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses/comparison`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.comparison.difference)).toBe(50);
      expect(response.body.comparison.percentage_change).toBe(50);
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`);

      expect(response.status).toBe(401);
    });

    it('should prevent cross-user access', async () => {
      const otherUserId = BigInt(999999);
      const response = await request(app)
        .get(`/api/v2/users/${otherUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no transactions gracefully', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('0.00');
      expect(response.body.expenses.count).toBe(0);
    });

    it('should handle single transaction', async () => {
      await prisma.transaction.create({
        data: {
          userId: testUserId,
          accountId: testAccountId,
          amount: -50.00,
          description: 'Single transaction',
          transactionType: 'debit',
          postedAt: new Date()
        }
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('50.00');
      expect(response.body.expenses.average).toBe('50.00');
    });

    it('should exclude credit transactions', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Expense',
            transactionType: 'debit',
            postedAt: new Date()
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: 100.00,
            description: 'Income',
            transactionType: 'credit',
            postedAt: new Date()
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('50.00');
      expect(response.body.expenses.count).toBe(1);
    });

    it('should exclude deleted transactions', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -50.00,
            description: 'Active',
            transactionType: 'debit',
            postedAt: new Date()
          },
          {
            userId: testUserId,
            accountId: testAccountId,
            amount: -30.00,
            description: 'Deleted',
            transactionType: 'debit',
            postedAt: new Date(),
            deletedAt: new Date()
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v2/users/${testUserId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.expenses.total).toBe('50.00');
      expect(response.body.expenses.count).toBe(1);
    });
  });
});
