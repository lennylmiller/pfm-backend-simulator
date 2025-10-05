import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../src/config/auth';
import { Decimal } from '@prisma/client/runtime/library';

describe('Networth API', () => {
  let authToken: string;
  let userId: string;
  let partnerId: string;
  let accountIds: { [key: string]: string } = {};

  beforeAll(async () => {
    // Create test partner
    const partner = await prisma.partner.create({
      data: {
        name: 'Test Bank Networth',
        domain: 'networthtest.com',
      },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        partnerId: partner.id,
        email: 'networth@example.com',
        hashedPassword: 'hashed',
        firstName: 'Networth',
        lastName: 'Test',
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

    // Create diverse test accounts for comprehensive testing
    const accounts = [
      // Asset accounts
      {
        name: 'checking',
        accountType: 'checking',
        balance: new Decimal('5000.00'),
        includeInNetworth: true,
        state: 'active',
      },
      {
        name: 'savings',
        accountType: 'savings',
        balance: new Decimal('10000.50'),
        includeInNetworth: true,
        state: 'active',
      },
      {
        name: 'investment',
        accountType: 'investment',
        balance: new Decimal('25000.75'),
        includeInNetworth: true,
        state: 'active',
      },
      {
        name: 'other_positive',
        accountType: 'other',
        balance: new Decimal('1000.00'),
        includeInNetworth: true,
        state: 'active',
      },
      // Liability accounts
      {
        name: 'credit_card',
        accountType: 'credit_card',
        balance: new Decimal('-2500.00'),
        includeInNetworth: true,
        state: 'active',
      },
      {
        name: 'loan',
        accountType: 'loan',
        balance: new Decimal('-15000.25'),
        includeInNetworth: true,
        state: 'active',
      },
      {
        name: 'mortgage',
        accountType: 'mortgage',
        balance: new Decimal('-200000.00'),
        includeInNetworth: true,
        state: 'active',
      },
      {
        name: 'other_negative',
        accountType: 'other',
        balance: new Decimal('-500.00'),
        includeInNetworth: true,
        state: 'active',
      },
      // Excluded accounts
      {
        name: 'excluded',
        accountType: 'checking',
        balance: new Decimal('999.99'),
        includeInNetworth: false,
        state: 'active',
      },
      {
        name: 'archived',
        accountType: 'checking',
        balance: new Decimal('888.88'),
        includeInNetworth: true,
        state: 'active',
        archivedAt: new Date(),
      },
    ];

    for (const accountData of accounts) {
      const account = await prisma.account.create({
        data: {
          userId: user.id,
          partnerId: partner.id,
          name: accountData.name,
          accountType: accountData.accountType as any,
          balance: accountData.balance,
          includeInNetworth: accountData.includeInNetworth,
          state: accountData.state as any,
          archivedAt: (accountData as any).archivedAt || null,
        },
      });
      accountIds[accountData.name] = account.id.toString();
    }
  });

  afterAll(async () => {
    // Cleanup
    await prisma.account.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.user.deleteMany({ where: { id: BigInt(userId) } });
    await prisma.partner.deleteMany({ where: { id: BigInt(partnerId) } });
  });

  describe('GET /users/:userId/networth', () => {
    it('should calculate networth correctly', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('networth');
      const networth = response.body.networth;

      // Expected calculations:
      // Assets: 5000.00 + 10000.50 + 25000.75 + 1000.00 = 41001.25
      // Liabilities: 2500.00 + 15000.25 + 200000.00 + 500.00 = 218000.25
      // Networth: 41001.25 - 218000.25 = -177000.00 (negative networth)

      expect(networth.assets).toBe('41001.25');
      expect(networth.liabilities).toBe('218000.25');
      expect(networth.networth).toBe('-176999.00');
      expect(networth).toHaveProperty('as_of_date');
    });

    it('should separate assets and liabilities', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const networth = response.body.networth;

      // Assets should be positive
      expect(parseFloat(networth.assets)).toBeGreaterThan(0);

      // Liabilities should be positive (absolute value)
      expect(parseFloat(networth.liabilities)).toBeGreaterThan(0);
    });

    it('should respect includeInNetworth flag', async () => {
      // The excluded account has 999.99 which should not affect the calculation
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const networth = response.body.networth;

      // Should not include the excluded account's 999.99
      expect(networth.assets).not.toBe('42001.24'); // would be this if included
      expect(networth.assets).toBe('41001.25');
    });

    it('should exclude archived accounts', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const networth = response.body.networth;

      // Should not include the archived account's 888.88
      expect(networth.assets).not.toBe('41890.13'); // would be this if included
      expect(networth.assets).toBe('41001.25');
    });

    it('should handle zero balances', async () => {
      // Create user with zero balance accounts
      const zeroPartner = await prisma.partner.create({
        data: { name: 'Zero Bank', domain: 'zero.com' },
      });

      const zeroUser = await prisma.user.create({
        data: {
          partnerId: zeroPartner.id,
          email: 'zero@example.com',
        },
      });

      await prisma.account.create({
        data: {
          userId: zeroUser.id,
          partnerId: zeroPartner.id,
          name: 'Zero Account',
          accountType: 'checking',
          balance: new Decimal('0.00'),
          includeInNetworth: true,
          state: 'active',
        },
      });

      const zeroToken = jwt.sign(
        { userId: zeroUser.id.toString(), partnerId: zeroPartner.id.toString() },
        authConfig.jwtSecret,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get(`/api/v2/users/${zeroUser.id}/networth`)
        .set('Authorization', `Bearer ${zeroToken}`)
        .expect(200);

      expect(response.body.networth.assets).toBe('0.00');
      expect(response.body.networth.liabilities).toBe('0.00');
      expect(response.body.networth.networth).toBe('0.00');

      // Cleanup
      await prisma.account.deleteMany({ where: { userId: zeroUser.id } });
      await prisma.user.deleteMany({ where: { id: zeroUser.id } });
      await prisma.partner.deleteMany({ where: { id: zeroPartner.id } });
    });

    it('should handle all assets (no liabilities)', async () => {
      // Create user with only asset accounts
      const assetPartner = await prisma.partner.create({
        data: { name: 'Asset Bank', domain: 'asset.com' },
      });

      const assetUser = await prisma.user.create({
        data: {
          partnerId: assetPartner.id,
          email: 'asset@example.com',
        },
      });

      await prisma.account.create({
        data: {
          userId: assetUser.id,
          partnerId: assetPartner.id,
          name: 'Assets Only',
          accountType: 'checking',
          balance: new Decimal('50000.00'),
          includeInNetworth: true,
          state: 'active',
        },
      });

      const assetToken = jwt.sign(
        { userId: assetUser.id.toString(), partnerId: assetPartner.id.toString() },
        authConfig.jwtSecret,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get(`/api/v2/users/${assetUser.id}/networth`)
        .set('Authorization', `Bearer ${assetToken}`)
        .expect(200);

      expect(response.body.networth.assets).toBe('50000.00');
      expect(response.body.networth.liabilities).toBe('0.00');
      expect(response.body.networth.networth).toBe('50000.00');

      // Cleanup
      await prisma.account.deleteMany({ where: { userId: assetUser.id } });
      await prisma.user.deleteMany({ where: { id: assetUser.id } });
      await prisma.partner.deleteMany({ where: { id: assetPartner.id } });
    });

    it('should handle all liabilities (negative networth)', async () => {
      // Our main test user already has negative networth
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const networth = parseFloat(response.body.networth.networth);
      expect(networth).toBeLessThan(0);
    });

    it('should support as_of_date parameter', async () => {
      const asOfDate = new Date('2025-01-01').toISOString();

      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth?as_of_date=${asOfDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.networth).toHaveProperty('as_of_date');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v2/users/${userId}/networth`)
        .expect(401);
    });

    it('should return 403 for different user', async () => {
      await request(app)
        .get('/api/v2/users/99999/networth')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('GET /users/:userId/networth/details', () => {
    it('should return networth with account breakdown', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('networth');
      const networth = response.body.networth;

      expect(networth).toHaveProperty('assets');
      expect(networth).toHaveProperty('liabilities');
      expect(networth).toHaveProperty('networth');
      expect(networth).toHaveProperty('as_of_date');
      expect(networth).toHaveProperty('asset_accounts');
      expect(networth).toHaveProperty('liability_accounts');

      expect(Array.isArray(networth.asset_accounts)).toBe(true);
      expect(Array.isArray(networth.liability_accounts)).toBe(true);
    });

    it('should categorize asset accounts correctly', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const assets = response.body.networth.asset_accounts;

      // Should have 4 asset accounts: checking, savings, investment, other_positive
      expect(assets.length).toBe(4);

      // Check that each has required fields
      assets.forEach((account: any) => {
        expect(account).toHaveProperty('account_id');
        expect(account).toHaveProperty('account_name');
        expect(account).toHaveProperty('account_type');
        expect(account).toHaveProperty('balance');
        expect(account).toHaveProperty('contribution');
      });

      // Find checking account
      const checking = assets.find((a: any) => a.account_name === 'checking');
      expect(checking).toBeDefined();
      expect(checking.account_type).toBe('checking');
      expect(checking.balance).toBe('5000.00');
      expect(checking.contribution).toBe('5000.00');
    });

    it('should categorize liability accounts correctly', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const liabilities = response.body.networth.liability_accounts;

      // Should have 4 liability accounts: credit_card, loan, mortgage, other_negative
      expect(liabilities.length).toBe(4);

      // Check that each has required fields
      liabilities.forEach((account: any) => {
        expect(account).toHaveProperty('account_id');
        expect(account).toHaveProperty('account_name');
        expect(account).toHaveProperty('account_type');
        expect(account).toHaveProperty('balance');
        expect(account).toHaveProperty('contribution');
      });

      // Find credit card account
      const creditCard = liabilities.find((a: any) => a.account_name === 'credit_card');
      expect(creditCard).toBeDefined();
      expect(creditCard.account_type).toBe('credit_card');
      expect(creditCard.balance).toBe('-2500.00');
      expect(creditCard.contribution).toBe('-2500.00');
    });

    it('should calculate contributions correctly', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const networth = response.body.networth;

      // Asset contributions should be positive
      networth.asset_accounts.forEach((account: any) => {
        expect(parseFloat(account.contribution)).toBeGreaterThanOrEqual(0);
      });

      // Liability contributions should be negative
      networth.liability_accounts.forEach((account: any) => {
        expect(parseFloat(account.contribution)).toBeLessThanOrEqual(0);
      });
    });

    it('should handle other account type based on balance', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const networth = response.body.networth;

      // other_positive should be in assets
      const otherPositive = networth.asset_accounts.find(
        (a: any) => a.account_name === 'other_positive'
      );
      expect(otherPositive).toBeDefined();
      expect(otherPositive.account_type).toBe('other');
      expect(parseFloat(otherPositive.balance)).toBeGreaterThan(0);

      // other_negative should be in liabilities
      const otherNegative = networth.liability_accounts.find(
        (a: any) => a.account_name === 'other_negative'
      );
      expect(otherNegative).toBeDefined();
      expect(otherNegative.account_type).toBe('other');
      expect(parseFloat(otherNegative.balance)).toBeLessThan(0);
    });
  });

  describe('Account Type Categorization', () => {
    it('should categorize checking as asset', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const checking = response.body.networth.asset_accounts.find(
        (a: any) => a.account_type === 'checking'
      );
      expect(checking).toBeDefined();
    });

    it('should categorize savings as asset', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const savings = response.body.networth.asset_accounts.find(
        (a: any) => a.account_type === 'savings'
      );
      expect(savings).toBeDefined();
    });

    it('should categorize investment as asset', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const investment = response.body.networth.asset_accounts.find(
        (a: any) => a.account_type === 'investment'
      );
      expect(investment).toBeDefined();
    });

    it('should categorize credit_card as liability', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const creditCard = response.body.networth.liability_accounts.find(
        (a: any) => a.account_type === 'credit_card'
      );
      expect(creditCard).toBeDefined();
    });

    it('should categorize loan as liability', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const loan = response.body.networth.liability_accounts.find(
        (a: any) => a.account_type === 'loan'
      );
      expect(loan).toBeDefined();
    });

    it('should categorize mortgage as liability', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const mortgage = response.body.networth.liability_accounts.find(
        (a: any) => a.account_type === 'mortgage'
      );
      expect(mortgage).toBeDefined();
    });
  });

  describe('Decimal Precision', () => {
    it('should handle decimal balances precisely', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // All amounts should have exactly 2 decimal places
      expect(response.body.networth.assets).toMatch(/^\d+\.\d{2}$/);
      expect(response.body.networth.liabilities).toMatch(/^\d+\.\d{2}$/);
      expect(response.body.networth.networth).toMatch(/^-?\d+\.\d{2}$/);
    });

    it('should not have rounding errors', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const networth = response.body.networth;

      // Calculate expected values
      const assets = parseFloat(networth.assets);
      const liabilities = parseFloat(networth.liabilities);
      const total = parseFloat(networth.networth);

      // Verify calculation is precise
      expect(total).toBeCloseTo(assets - liabilities, 2);
    });

    it('should format to 2 decimal places', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/networth/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const accounts = [
        ...response.body.networth.asset_accounts,
        ...response.body.networth.liability_accounts,
      ];

      accounts.forEach((account: any) => {
        expect(account.balance).toMatch(/^-?\d+\.\d{2}$/);
        expect(account.contribution).toMatch(/^-?\d+\.\d{2}$/);
      });
    });
  });
});
