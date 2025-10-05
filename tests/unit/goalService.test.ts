import { Decimal } from '@prisma/client/runtime/library';
import * as goalService from '../../src/services/goalService';
import { prisma } from '../../src/config/database';

// Mock Prisma
jest.mock('../../src/config/database', () => ({
  prisma: {
    goal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
  },
}));

describe('goalService', () => {
  const mockUserId = BigInt(1);
  const mockGoalId = BigInt(100);
  const mockAccountId = BigInt(50);

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('calculateProgress', () => {
    it('should calculate payoff goal progress correctly', () => {
      const payoffGoal = {
        goalType: 'payoff',
        targetAmount: new Decimal(0),
        currentAmount: new Decimal(500),
        metadata: { initialValue: '1000.00' },
      } as any;

      const progress = goalService.calculateProgress(payoffGoal);
      expect(progress).toBe(50); // (1000 - 500) / 1000 * 100
    });

    it('should calculate savings goal progress correctly', () => {
      const savingsGoal = {
        goalType: 'savings',
        targetAmount: new Decimal(10000),
        currentAmount: new Decimal(7500),
        metadata: {},
      } as any;

      const progress = goalService.calculateProgress(savingsGoal);
      expect(progress).toBe(75); // 7500 / 10000 * 100
    });

    it('should cap progress at 100%', () => {
      const savingsGoal = {
        goalType: 'savings',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(1500),
        metadata: {},
      } as any;

      const progress = goalService.calculateProgress(savingsGoal);
      expect(progress).toBe(100);
    });

    it('should handle zero target for savings goals', () => {
      const savingsGoal = {
        goalType: 'savings',
        targetAmount: new Decimal(0),
        currentAmount: new Decimal(500),
        metadata: {},
      } as any;

      const progress = goalService.calculateProgress(savingsGoal);
      expect(progress).toBe(0);
    });
  });

  describe('calculateStatus', () => {
    it('should return "complete" when progress is 100%', () => {
      const goal = {
        goalType: 'savings',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(1000),
        targetDate: null,
        createdAt: new Date(),
        metadata: {},
      } as any;

      const status = goalService.calculateStatus(goal);
      expect(status).toBe('complete');
    });

    it('should return "under" when no target date', () => {
      const goal = {
        goalType: 'savings',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(500),
        targetDate: null,
        createdAt: new Date(),
        metadata: {},
      } as any;

      const status = goalService.calculateStatus(goal);
      expect(status).toBe('under');
    });

    it('should return "risk" when behind expected progress', () => {
      const createdAt = new Date('2024-01-01');
      const targetDate = new Date('2024-12-31');
      const now = new Date('2024-07-01'); // ~50% through timeline

      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      const goal = {
        goalType: 'savings',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(300), // Only 30% progress, should be ~50%
        targetDate,
        createdAt,
        metadata: {},
      } as any;

      const status = goalService.calculateStatus(goal);
      expect(status).toBe('risk');

      jest.restoreAllMocks();
    });

    it('should return "under" when on track', () => {
      const createdAt = new Date('2024-01-01');
      const targetDate = new Date('2024-12-31');
      const now = new Date('2024-07-01');

      jest.useFakeTimers();
      jest.setSystemTime(now);

      const goal = {
        goalType: 'savings',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(500), // 50% progress, right on track
        targetDate,
        createdAt,
        metadata: {},
      } as any;

      const status = goalService.calculateStatus(goal);
      expect(status).toBe('under');

      jest.useRealTimers();
    });
  });

  describe('getPayoffGoals', () => {
    it('should fetch payoff goals without archived', async () => {
      const mockGoals = [
        {
          id: mockGoalId,
          userId: mockUserId,
          goalType: 'payoff',
          name: 'Credit Card Payoff',
          targetAmount: new Decimal(0),
          currentAmount: new Decimal(500),
          archivedAt: null,
          deletedAt: null,
        },
      ];

      (prisma.goal.findMany as jest.Mock).mockResolvedValue(mockGoals);

      const result = await goalService.getPayoffGoals(mockUserId, { includeArchived: false });

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          goalType: 'payoff',
          deletedAt: null,
          archivedAt: null,
        },
        orderBy: [
          { archivedAt: 'asc' },
          { createdAt: 'desc' }
        ],
      });
      expect(result).toEqual(mockGoals);
    });

    it('should fetch payoff goals including archived', async () => {
      const mockGoals = [
        {
          id: mockGoalId,
          userId: mockUserId,
          goalType: 'payoff',
          name: 'Credit Card Payoff',
          archivedAt: new Date(),
        },
      ];

      (prisma.goal.findMany as jest.Mock).mockResolvedValue(mockGoals);

      await goalService.getPayoffGoals(mockUserId, { includeArchived: true });

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          goalType: 'payoff',
          deletedAt: null,
        },
        orderBy: [
          { archivedAt: 'asc' },
          { createdAt: 'desc' }
        ],
      });
    });
  });

  describe('createPayoffGoal', () => {
    it('should create a payoff goal successfully', async () => {
      const mockAccount = {
        id: mockAccountId,
        userId: mockUserId,
        archivedAt: null,
      };

      const goalData = {
        name: 'Pay off credit card',
        currentValue: '1000.00',
        accountId: mockAccountId,
        targetCompletionOn: '2025-12-31',
        monthlyContribution: '100.00',
        imageUrl: 'https://example.com/image.jpg',
      };

      const mockCreatedGoal = {
        id: mockGoalId,
        userId: mockUserId,
        goalType: 'payoff',
        name: goalData.name,
        targetAmount: new Decimal(0),
        currentAmount: new Decimal(goalData.currentValue),
        accountId: mockAccountId,
        targetDate: new Date('2025-12-31'),
        imageUrl: goalData.imageUrl,
        metadata: {
          initialValue: goalData.currentValue,
          monthlyContribution: goalData.monthlyContribution,
        },
      };

      (prisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (prisma.goal.create as jest.Mock).mockResolvedValue(mockCreatedGoal);

      const result = await goalService.createPayoffGoal(mockUserId, goalData);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: mockAccountId, userId: mockUserId, archivedAt: null },
      });
      expect(prisma.goal.create).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedGoal);
    });

    it('should throw error if account not found', async () => {
      const goalData = {
        name: 'Pay off credit card',
        currentValue: '1000.00',
        accountId: mockAccountId,
      };

      (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(goalService.createPayoffGoal(mockUserId, goalData)).rejects.toThrow(
        'Account not found or does not belong to user'
      );
    });
  });

  describe('createSavingsGoal', () => {
    it('should create a savings goal successfully', async () => {
      const goalData = {
        name: 'Vacation fund',
        targetValue: '5000.00',
        currentValue: '1000.00',
        targetCompletionOn: '2025-08-01',
        monthlyContribution: '200.00',
        imageUrl: 'https://example.com/vacation.jpg',
      };

      const mockCreatedGoal = {
        id: mockGoalId,
        userId: mockUserId,
        goalType: 'savings',
        name: goalData.name,
        targetAmount: new Decimal(goalData.targetValue),
        currentAmount: new Decimal(goalData.currentValue),
        targetDate: new Date('2025-08-01'),
        imageUrl: goalData.imageUrl,
        metadata: {
          initialValue: goalData.currentValue,
          monthlyContribution: goalData.monthlyContribution,
        },
      };

      (prisma.goal.create as jest.Mock).mockResolvedValue(mockCreatedGoal);

      const result = await goalService.createSavingsGoal(mockUserId, goalData);

      expect(prisma.goal.create).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedGoal);
    });

    it('should create savings goal with account validation', async () => {
      const mockAccount = {
        id: mockAccountId,
        userId: mockUserId,
        archivedAt: null,
      };

      const goalData = {
        name: 'Emergency fund',
        targetValue: '10000.00',
        accountId: mockAccountId,
      };

      (prisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (prisma.goal.create as jest.Mock).mockResolvedValue({});

      await goalService.createSavingsGoal(mockUserId, goalData);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: mockAccountId, userId: mockUserId, archivedAt: null },
      });
    });
  });

  describe('updatePayoffGoal', () => {
    it('should update a payoff goal successfully', async () => {
      const updates = {
        name: 'Updated name',
        currentValue: '750.00',
      };

      const mockExistingGoal = {
        id: mockGoalId,
        userId: mockUserId,
        goalType: 'payoff',
        deletedAt: null,
      };

      const mockUpdatedGoal = {
        ...mockExistingGoal,
        name: updates.name,
        currentAmount: new Decimal(updates.currentValue),
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(mockExistingGoal);
      (prisma.goal.update as jest.Mock).mockResolvedValue(mockUpdatedGoal);

      const result = await goalService.updatePayoffGoal(mockUserId, mockGoalId, updates);

      expect(prisma.goal.findFirst).toHaveBeenCalledWith({
        where: { id: mockGoalId, userId: mockUserId, goalType: 'payoff', deletedAt: null },
      });
      expect(prisma.goal.update).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedGoal);
    });

    it('should return null if goal not found', async () => {
      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await goalService.updatePayoffGoal(mockUserId, mockGoalId, { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('deletePayoffGoal', () => {
    it('should soft delete a payoff goal', async () => {
      (prisma.goal.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await goalService.deletePayoffGoal(mockUserId, mockGoalId);

      expect(result).toBe(true);
      expect(prisma.goal.updateMany).toHaveBeenCalledWith({
        where: {
          id: mockGoalId,
          userId: mockUserId,
          goalType: 'payoff',
          deletedAt: null
        },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should return false if goal not found', async () => {
      (prisma.goal.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await goalService.deletePayoffGoal(mockUserId, mockGoalId);

      expect(result).toBe(false);
    });
  });

  describe('archivePayoffGoal', () => {
    it('should archive a payoff goal', async () => {
      (prisma.goal.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await goalService.archivePayoffGoal(mockUserId, mockGoalId);

      expect(result).toBe(true);
      expect(prisma.goal.updateMany).toHaveBeenCalledWith({
        where: {
          id: mockGoalId,
          userId: mockUserId,
          goalType: 'payoff',
          deletedAt: null
        },
        data: { archivedAt: expect.any(Date) },
      });
    });
  });

  describe('getSavingsGoals', () => {
    it('should fetch savings goals', async () => {
      const mockGoals = [
        {
          id: mockGoalId,
          userId: mockUserId,
          goalType: 'savings',
          name: 'Vacation',
          targetAmount: new Decimal(5000),
          currentAmount: new Decimal(2500),
        },
      ];

      (prisma.goal.findMany as jest.Mock).mockResolvedValue(mockGoals);

      const result = await goalService.getSavingsGoals(mockUserId, { includeArchived: false });

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          goalType: 'savings',
          deletedAt: null,
          archivedAt: null,
        },
        orderBy: [
          { archivedAt: 'asc' },
          { createdAt: 'desc' }
        ],
      });
      expect(result).toEqual(mockGoals);
    });
  });

  describe('getSavingsGoalById', () => {
    it('should fetch a single savings goal', async () => {
      const mockGoal = {
        id: mockGoalId,
        userId: mockUserId,
        goalType: 'savings',
        name: 'Emergency Fund',
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(mockGoal);

      const result = await goalService.getSavingsGoalById(mockUserId, mockGoalId);

      expect(prisma.goal.findFirst).toHaveBeenCalledWith({
        where: { id: mockGoalId, userId: mockUserId, goalType: 'savings', deletedAt: null },
      });
      expect(result).toEqual(mockGoal);
    });
  });
});
