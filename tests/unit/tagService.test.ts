import * as tagService from '../../src/services/tagService';
import { prisma } from '../../src/config/database';

// Mock Prisma
jest.mock('../../src/config/database', () => ({
  prisma: {
    tag: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
    },
  },
}));

describe('tagService', () => {
  const mockUserId = BigInt(1);
  const mockPartnerId = BigInt(10);
  const mockTagId = BigInt(100);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemTags', () => {
    it('should fetch all system tags', async () => {
      const mockSystemTags = [
        {
          id: BigInt(1),
          name: 'Groceries',
          tagType: 'system',
          parentTagId: null,
          partnerId: null,
          userId: null,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: BigInt(2),
          name: 'Entertainment',
          tagType: 'system',
          parentTagId: null,
          partnerId: null,
          userId: null,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.tag.findMany as jest.Mock).mockResolvedValue(mockSystemTags);

      const result = await tagService.getSystemTags();

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: { tagType: 'system' },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockSystemTags);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no system tags exist', async () => {
      (prisma.tag.findMany as jest.Mock).mockResolvedValue([]);

      const result = await tagService.getSystemTags();

      expect(result).toEqual([]);
    });
  });

  describe('getUserTagsWithCounts', () => {
    it('should fetch user tags with transaction counts', async () => {
      const mockUser = { partnerId: mockPartnerId };
      const mockTags = [
        {
          id: BigInt(1),
          name: 'Groceries',
          tagType: 'system',
          parentTagId: null,
          partnerId: null,
          userId: null,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: BigInt(2),
          name: 'Partner Tag',
          tagType: 'partner',
          parentTagId: null,
          partnerId: mockPartnerId,
          userId: null,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: BigInt(3),
          name: 'My Custom Tag',
          tagType: 'user',
          parentTagId: null,
          partnerId: null,
          userId: mockUserId,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.tag.findMany as jest.Mock).mockResolvedValue(mockTags);
      (prisma.transaction.count as jest.Mock)
        .mockResolvedValueOnce(45) // Groceries
        .mockResolvedValueOnce(12) // Partner Tag
        .mockResolvedValueOnce(3); // My Custom Tag

      const result = await tagService.getUserTagsWithCounts(mockUserId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { partnerId: true },
      });

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { tagType: 'system' },
            { tagType: 'partner', partnerId: mockPartnerId },
            { tagType: 'user', userId: mockUserId },
          ],
        },
        orderBy: [{ tagType: 'asc' }, { name: 'asc' }],
      });

      expect(prisma.transaction.count).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
      expect(result[0].transactionCount).toBe(45);
      expect(result[1].transactionCount).toBe(12);
      expect(result[2].transactionCount).toBe(3);
    });

    it('should throw error when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(tagService.getUserTagsWithCounts(mockUserId)).rejects.toThrow('User not found');
    });

    it('should return empty counts for tags with no transactions', async () => {
      const mockUser = { partnerId: mockPartnerId };
      const mockTags = [
        {
          id: BigInt(1),
          name: 'Unused Tag',
          tagType: 'user',
          parentTagId: null,
          partnerId: null,
          userId: mockUserId,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.tag.findMany as jest.Mock).mockResolvedValue(mockTags);
      (prisma.transaction.count as jest.Mock).mockResolvedValue(0);

      const result = await tagService.getUserTagsWithCounts(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].transactionCount).toBe(0);
    });
  });

  describe('executeBulkTagOperations', () => {
    it('should create tags successfully', async () => {
      const operations = {
        create: [
          { name: 'New Tag 1', parentTagId: BigInt(5) },
          { name: 'New Tag 2' },
        ],
      };

      const mockCreatedTags = [
        {
          id: BigInt(101),
          name: 'New Tag 1',
          parentTagId: BigInt(5),
          tagType: 'user',
          userId: mockUserId,
          partnerId: null,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: BigInt(102),
          name: 'New Tag 2',
          parentTagId: null,
          tagType: 'user',
          userId: mockUserId,
          partnerId: null,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.tag.create as jest.Mock)
        .mockResolvedValueOnce(mockCreatedTags[0])
        .mockResolvedValueOnce(mockCreatedTags[1]);

      const result = await tagService.executeBulkTagOperations(mockUserId, operations);

      expect(prisma.tag.create).toHaveBeenCalledTimes(2);
      expect(result.created).toHaveLength(2);
      expect(result.created[0].name).toBe('New Tag 1');
      expect(result.created[1].name).toBe('New Tag 2');
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
    });

    it('should update tags successfully', async () => {
      const operations = {
        update: [
          { id: BigInt(100), name: 'Updated Tag Name' },
          { id: BigInt(101), name: 'Another Update' },
        ],
      };

      const mockExistingTags = [
        {
          id: BigInt(100),
          name: 'Old Name',
          tagType: 'user',
          userId: mockUserId,
          partnerId: null,
          parentTagId: null,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: BigInt(101),
          name: 'Old Name 2',
          tagType: 'user',
          userId: mockUserId,
          partnerId: null,
          parentTagId: null,
          icon: null,
          color: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockUpdatedTags = [
        { ...mockExistingTags[0], name: 'Updated Tag Name' },
        { ...mockExistingTags[1], name: 'Another Update' },
      ];

      (prisma.tag.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockExistingTags[0])
        .mockResolvedValueOnce(mockExistingTags[1]);

      (prisma.tag.update as jest.Mock)
        .mockResolvedValueOnce(mockUpdatedTags[0])
        .mockResolvedValueOnce(mockUpdatedTags[1]);

      const result = await tagService.executeBulkTagOperations(mockUserId, operations);

      expect(prisma.tag.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.tag.update).toHaveBeenCalledTimes(2);
      expect(result.updated).toHaveLength(2);
      expect(result.updated[0].name).toBe('Updated Tag Name');
      expect(result.created).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
    });

    it('should skip updating tags not owned by user', async () => {
      const operations = {
        update: [
          { id: BigInt(100), name: 'Updated Tag Name' },
        ],
      };

      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await tagService.executeBulkTagOperations(mockUserId, operations);

      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: {
          id: BigInt(100),
          userId: mockUserId,
          tagType: 'user',
        },
      });
      expect(prisma.tag.update).not.toHaveBeenCalled();
      expect(result.updated).toHaveLength(0);
    });

    it('should delete tags successfully', async () => {
      const operations = {
        delete: [BigInt(100), BigInt(101)],
      };

      const mockExistingTags = [
        {
          id: BigInt(100),
          name: 'Tag 1',
          tagType: 'user',
          userId: mockUserId,
        },
        {
          id: BigInt(101),
          name: 'Tag 2',
          tagType: 'user',
          userId: mockUserId,
        },
      ];

      (prisma.tag.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockExistingTags[0])
        .mockResolvedValueOnce(mockExistingTags[1]);

      (prisma.tag.delete as jest.Mock).mockResolvedValue({});

      const result = await tagService.executeBulkTagOperations(mockUserId, operations);

      expect(prisma.tag.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.tag.delete).toHaveBeenCalledTimes(2);
      expect(result.deleted).toHaveLength(2);
      expect(result.deleted).toContain(BigInt(100));
      expect(result.deleted).toContain(BigInt(101));
      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
    });

    it('should skip deleting tags not owned by user', async () => {
      const operations = {
        delete: [BigInt(100)],
      };

      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await tagService.executeBulkTagOperations(mockUserId, operations);

      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: {
          id: BigInt(100),
          userId: mockUserId,
          tagType: 'user',
        },
      });
      expect(prisma.tag.delete).not.toHaveBeenCalled();
      expect(result.deleted).toHaveLength(0);
    });

    it('should handle mixed operations', async () => {
      const operations = {
        create: [{ name: 'New Tag' }],
        update: [{ id: BigInt(100), name: 'Updated' }],
        delete: [BigInt(101)],
      };

      const mockCreatedTag = {
        id: BigInt(102),
        name: 'New Tag',
        tagType: 'user',
        userId: mockUserId,
      };

      const mockExistingUpdateTag = {
        id: BigInt(100),
        name: 'Old',
        tagType: 'user',
        userId: mockUserId,
      };

      const mockUpdatedTag = { ...mockExistingUpdateTag, name: 'Updated' };

      const mockExistingDeleteTag = {
        id: BigInt(101),
        name: 'To Delete',
        tagType: 'user',
        userId: mockUserId,
      };

      (prisma.tag.create as jest.Mock).mockResolvedValue(mockCreatedTag);
      (prisma.tag.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockExistingUpdateTag)
        .mockResolvedValueOnce(mockExistingDeleteTag);
      (prisma.tag.update as jest.Mock).mockResolvedValue(mockUpdatedTag);
      (prisma.tag.delete as jest.Mock).mockResolvedValue({});

      const result = await tagService.executeBulkTagOperations(mockUserId, operations);

      expect(result.created).toHaveLength(1);
      expect(result.updated).toHaveLength(1);
      expect(result.deleted).toHaveLength(1);
    });

    it('should handle empty operations', async () => {
      const operations = {};

      const result = await tagService.executeBulkTagOperations(mockUserId, operations);

      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
    });
  });

  describe('createUserTag', () => {
    it('should create a user tag successfully', async () => {
      const tagData = {
        name: 'My Tag',
        parentTagId: BigInt(5),
      };

      const mockCreatedTag = {
        id: BigInt(100),
        userId: mockUserId,
        name: tagData.name,
        parentTagId: tagData.parentTagId,
        tagType: 'user',
        partnerId: null,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.tag.create as jest.Mock).mockResolvedValue(mockCreatedTag);

      const result = await tagService.createUserTag(mockUserId, tagData);

      expect(prisma.tag.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          name: tagData.name,
          parentTagId: tagData.parentTagId,
          tagType: 'user',
        },
      });
      expect(result).toEqual(mockCreatedTag);
    });

    it('should create tag without parent', async () => {
      const tagData = { name: 'Standalone Tag' };

      const mockCreatedTag = {
        id: BigInt(100),
        userId: mockUserId,
        name: tagData.name,
        parentTagId: null,
        tagType: 'user',
      };

      (prisma.tag.create as jest.Mock).mockResolvedValue(mockCreatedTag);

      const result = await tagService.createUserTag(mockUserId, tagData);

      expect(prisma.tag.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          name: tagData.name,
          parentTagId: null,
          tagType: 'user',
        },
      });
      expect(result).toEqual(mockCreatedTag);
    });
  });

  describe('updateUserTag', () => {
    it('should update a user tag successfully', async () => {
      const mockExistingTag = {
        id: mockTagId,
        userId: mockUserId,
        name: 'Old Name',
        tagType: 'user',
      };

      const mockUpdatedTag = {
        ...mockExistingTag,
        name: 'New Name',
      };

      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(mockExistingTag);
      (prisma.tag.update as jest.Mock).mockResolvedValue(mockUpdatedTag);

      const result = await tagService.updateUserTag(mockUserId, mockTagId, 'New Name');

      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockTagId,
          userId: mockUserId,
          tagType: 'user',
        },
      });
      expect(prisma.tag.update).toHaveBeenCalledWith({
        where: { id: mockTagId },
        data: { name: 'New Name' },
      });
      expect(result).toEqual(mockUpdatedTag);
    });

    it('should return null if tag not found or not owned', async () => {
      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await tagService.updateUserTag(mockUserId, mockTagId, 'New Name');

      expect(result).toBeNull();
      expect(prisma.tag.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserTag', () => {
    it('should delete a user tag successfully', async () => {
      const mockExistingTag = {
        id: mockTagId,
        userId: mockUserId,
        tagType: 'user',
      };

      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(mockExistingTag);
      (prisma.tag.delete as jest.Mock).mockResolvedValue({});

      const result = await tagService.deleteUserTag(mockUserId, mockTagId);

      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockTagId,
          userId: mockUserId,
          tagType: 'user',
        },
      });
      expect(prisma.tag.delete).toHaveBeenCalledWith({
        where: { id: mockTagId },
      });
      expect(result).toBe(true);
    });

    it('should return false if tag not found or not owned', async () => {
      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await tagService.deleteUserTag(mockUserId, mockTagId);

      expect(result).toBe(false);
      expect(prisma.tag.delete).not.toHaveBeenCalled();
    });
  });

  describe('getTagById', () => {
    it('should fetch a tag accessible to user', async () => {
      const mockUser = { partnerId: mockPartnerId };
      const mockTag = {
        id: mockTagId,
        name: 'Accessible Tag',
        tagType: 'system',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(mockTag);

      const result = await tagService.getTagById(mockUserId, mockTagId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { partnerId: true },
      });

      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockTagId,
          OR: [
            { tagType: 'system' },
            { tagType: 'partner', partnerId: mockPartnerId },
            { tagType: 'user', userId: mockUserId },
          ],
        },
      });

      expect(result).toEqual(mockTag);
    });

    it('should return null if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tagService.getTagById(mockUserId, mockTagId);

      expect(result).toBeNull();
      expect(prisma.tag.findFirst).not.toHaveBeenCalled();
    });

    it('should return null if tag not accessible', async () => {
      const mockUser = { partnerId: mockPartnerId };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await tagService.getTagById(mockUserId, mockTagId);

      expect(result).toBeNull();
    });
  });
});
