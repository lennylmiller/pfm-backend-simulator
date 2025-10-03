import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { logger } from '../config/logger';
import { serialize } from '../utils/serializers';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const notifications = await notificationService.getNotifications(userId);

    return res.json(serialize({ notifications }));
  } catch (error) {
    logger.error({ error }, 'Failed to get notifications');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await notificationService.deleteNotification(userId, id);

    return res.status(204).send();
  } catch (error) {
    logger.error({ error }, 'Failed to delete notification');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
