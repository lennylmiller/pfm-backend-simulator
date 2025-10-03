import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as notificationsController from '../controllers/notificationsController';

const router = Router({ mergeParams: true });

// GET /users/:userId/alerts/notifications
router.get('/', authenticateJWT, notificationsController.getNotifications);

// DELETE /users/:userId/alerts/notifications/:id
router.delete('/:id', authenticateJWT, notificationsController.deleteNotification);

export default router;
