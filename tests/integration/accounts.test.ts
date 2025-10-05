import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../src/config/auth';

describe('Accounts API', () => {
  let authToken: string;
  let userId: string;
  let partnerId: string;
  let testAccountId: string;

  beforeAll(async () => {
    // Create test partner
    const partner = await prisma.partner.create({
      data: {
        name: 'Test Bank',
        domain: 'testbank.com',
      },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        partnerId: partner.id,
        email: 'test@example.com',
        hashedPassword: 'hashed',
        firstName: 'Test',
        lastName: 'User',
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
    await prisma.account.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.user.deleteMany({ where: { id: BigInt(userId) } });
    await prisma.partner.deleteMany({ where: { id: BigInt(partnerId) } });
  });

  describe('GET /users/:userId/accounts/all', () => {
    it('should return all user accounts', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/accounts/all`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
      expect(Array.isArray(response.body.accounts)).toBe(true);
      expect(response.body.accounts.length).toBeGreaterThan(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v2/users/${userId}/accounts/all`)
        .expect(401);
    });

    it('should return 403 for different user', async () => {
      await request(app)
        .get('/api/v2/users/99999/accounts/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('GET /users/:userId/accounts/:id', () => {
    it('should return single account', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.account).toBeDefined();
      expect(response.body.account.name).toBe('Test Checking');
    });

    it('should return 404 for non-existent account', async () => {
      await request(app)
        .get(`/api/v2/users/${userId}/accounts/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /users/:userId/accounts/:id', () => {
    it('should update account successfully', async () => {
      const response = await request(app)
        .put(`/api/v2/users/${userId}/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account: {
            name: 'Updated Account Name',
            include_in_networth: false,
          },
        })
        .expect(200);

      expect(response.body.account.name).toBe('Updated Account Name');
      expect(response.body.account.include_in_networth).toBe(false);
    });
  });

  describe('PUT /users/:userId/accounts/:id/archive', () => {
    it('should archive account', async () => {
      const response = await request(app)
        .put(`/api/v2/users/${userId}/accounts/${testAccountId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.account.archived_at).toBeDefined();
    });
  });
});
