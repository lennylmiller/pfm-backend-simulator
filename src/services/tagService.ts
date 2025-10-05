/**
 * Tag Service
 * Business logic for tag operations including system, partner, and user tags
 */

import { prisma } from '../config/database';
import { Tag } from '@prisma/client';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CreateTagData {
  name: string;
  parentTagId?: bigint;
}

export interface UpdateTagData {
  id: bigint;
  name: string;
}

export interface BulkTagOperations {
  create?: CreateTagData[];
  update?: UpdateTagData[];
  delete?: bigint[];
}

export interface TagWithCount extends Tag {
  transactionCount: number;
}

// =============================================================================
// SYSTEM TAGS (Global)
// =============================================================================

/**
 * Get all system tags (available globally, no authentication needed)
 */
export async function getSystemTags(): Promise<Tag[]> {
  return await prisma.tag.findMany({
    where: { tagType: 'system' },
    orderBy: { name: 'asc' },
  });
}

// =============================================================================
// USER TAGS (Includes system + partner + user's own tags)
// =============================================================================

/**
 * Get all tags accessible to a user (system + partner + user's own)
 * with transaction counts
 */
export async function getUserTagsWithCounts(userId: bigint): Promise<TagWithCount[]> {
  // Get user to access partnerId
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { partnerId: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get all tags accessible to user
  const tags = await prisma.tag.findMany({
    where: {
      OR: [
        { tagType: 'system' },
        { tagType: 'partner', partnerId: user.partnerId },
        { tagType: 'user', userId },
      ],
    },
    orderBy: [
      { tagType: 'asc' }, // system first, then partner, then user
      { name: 'asc' },
    ],
  });

  // Calculate transaction counts for each tag
  const tagsWithCounts: TagWithCount[] = await Promise.all(
    tags.map(async (tag) => {
      const count = await prisma.transaction.count({
        where: {
          userId,
          primaryTagId: tag.id,
          deletedAt: null,
        },
      });

      return {
        ...tag,
        transactionCount: count,
      };
    })
  );

  return tagsWithCounts;
}

// =============================================================================
// BULK TAG OPERATIONS
// =============================================================================

/**
 * Execute bulk tag operations (create, update, delete)
 * Returns the results of each operation
 */
export async function executeBulkTagOperations(
  userId: bigint,
  operations: BulkTagOperations
): Promise<{
  created: Tag[];
  updated: Tag[];
  deleted: bigint[];
}> {
  const results = {
    created: [] as Tag[],
    updated: [] as Tag[],
    deleted: [] as bigint[],
  };

  // Create new tags
  if (operations.create && operations.create.length > 0) {
    for (const tagData of operations.create) {
      const tag = await prisma.tag.create({
        data: {
          userId,
          name: tagData.name,
          parentTagId: tagData.parentTagId || null,
          tagType: 'user',
        },
      });
      results.created.push(tag);
    }
  }

  // Update existing tags
  if (operations.update && operations.update.length > 0) {
    for (const tagData of operations.update) {
      // Verify ownership - only allow updating user's own tags
      const existing = await prisma.tag.findFirst({
        where: {
          id: tagData.id,
          userId,
          tagType: 'user',
        },
      });

      if (!existing) {
        continue; // Skip if not owned by user
      }

      const tag = await prisma.tag.update({
        where: { id: tagData.id },
        data: { name: tagData.name },
      });
      results.updated.push(tag);
    }
  }

  // Delete tags
  if (operations.delete && operations.delete.length > 0) {
    for (const tagId of operations.delete) {
      // Verify ownership - only allow deleting user's own tags
      const existing = await prisma.tag.findFirst({
        where: {
          id: tagId,
          userId,
          tagType: 'user',
        },
      });

      if (!existing) {
        continue; // Skip if not owned by user
      }

      await prisma.tag.delete({
        where: { id: tagId },
      });
      results.deleted.push(tagId);
    }
  }

  return results;
}

// =============================================================================
// INDIVIDUAL TAG OPERATIONS
// =============================================================================

/**
 * Create a single user tag
 */
export async function createUserTag(userId: bigint, data: CreateTagData): Promise<Tag> {
  return await prisma.tag.create({
    data: {
      userId,
      name: data.name,
      parentTagId: data.parentTagId || null,
      tagType: 'user',
    },
  });
}

/**
 * Update a user tag (only if owned by user)
 */
export async function updateUserTag(
  userId: bigint,
  tagId: bigint,
  name: string
): Promise<Tag | null> {
  // Verify ownership
  const existing = await prisma.tag.findFirst({
    where: {
      id: tagId,
      userId,
      tagType: 'user',
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.tag.update({
    where: { id: tagId },
    data: { name },
  });
}

/**
 * Delete a user tag (only if owned by user)
 */
export async function deleteUserTag(userId: bigint, tagId: bigint): Promise<boolean> {
  // Verify ownership
  const existing = await prisma.tag.findFirst({
    where: {
      id: tagId,
      userId,
      tagType: 'user',
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.tag.delete({
    where: { id: tagId },
  });

  return true;
}

/**
 * Get a single tag by ID (accessible to user)
 */
export async function getTagById(userId: bigint, tagId: bigint): Promise<Tag | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { partnerId: true },
  });

  if (!user) {
    return null;
  }

  return await prisma.tag.findFirst({
    where: {
      id: tagId,
      OR: [
        { tagType: 'system' },
        { tagType: 'partner', partnerId: user.partnerId },
        { tagType: 'user', userId },
      ],
    },
  });
}
