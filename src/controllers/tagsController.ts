/**
 * Tags Controller
 * Handles tag CRUD operations including system tags and user tags
 */

import { Request, Response, NextFunction } from 'express';
import * as tagService from '../services/tagService';
import { validateBulkTagOperations } from '../validators/tagSchemas';
import { serializeTag } from '../utils/serializers';
import { logger } from '../config/logger';

// =============================================================================
// SYSTEM TAGS (Global - No Authentication)
// =============================================================================

/**
 * GET /tags
 * Get all system tags (no authentication required)
 */
export async function listSystemTags(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tags = await tagService.getSystemTags();
    const serialized = tags.map(tag => serializeTag(tag));

    res.status(200).json({ tags: serialized });
  } catch (error) {
    logger.error({ error }, 'Failed to list system tags');
    next(error);
  }
}

// =============================================================================
// USER TAGS (With Transaction Counts)
// =============================================================================

/**
 * GET /users/:userId/tags
 * Get all tags accessible to user (system + partner + user's own)
 * with transaction counts
 */
export async function listUserTags(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const tagsWithCounts = await tagService.getUserTagsWithCounts(userId);
    const serialized = tagsWithCounts.map(tag =>
      serializeTag(tag, tag.transactionCount)
    );

    res.status(200).json({ tags: serialized });
  } catch (error) {
    logger.error({ error, userId: req.params.userId }, 'Failed to list user tags');
    next(error);
  }
}

// =============================================================================
// BULK TAG OPERATIONS
// =============================================================================

/**
 * PUT /users/:userId/tags
 * Execute bulk tag operations (create, update, delete)
 */
export async function bulkUpdateTags(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = BigInt(req.params.userId);
    const operations = req.body.tags;

    if (req.params.userId !== req.context?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Validate operations
    const validatedOps = validateBulkTagOperations(operations);

    // Convert validated operations to service format
    const serviceOps = {
      create: validatedOps.create,
      update: validatedOps.update,
      delete: validatedOps.delete
    };

    // Execute operations
    const results = await tagService.executeBulkTagOperations(userId, serviceOps);

    // Serialize results
    const response = {
      created: results.created.map(tag => serializeTag(tag)),
      updated: results.updated.map(tag => serializeTag(tag)),
      deleted: results.deleted.map(id => Number(id))
    };

    res.status(200).json(response);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }

    logger.error({ error, userId: req.params.userId }, 'Failed to execute bulk tag operations');
    next(error);
  }
}
