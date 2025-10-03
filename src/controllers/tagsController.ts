import { Request, Response } from 'express';
import { tagService } from '../services/tagService';
import { logger } from '../config/logger';
import { serialize } from '../utils/serializers';

export const getDefaultTags = async (req: Request, res: Response) => {
  try {
    const tags = await tagService.getDefaultTags();
    return res.json(serialize({ tags }));
  } catch (error) {
    logger.error({ error }, 'Failed to get default tags');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserTags = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const tags = await tagService.getUserTags(userId);
    return res.json(serialize({ tags }));
  } catch (error) {
    logger.error({ error }, 'Failed to get user tags');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserTags = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { tags } = req.body;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await tagService.updateUserTags(userId, tags);
    return res.json(serialize({ tags: updated }));
  } catch (error) {
    logger.error({ error }, 'Failed to update user tags');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
