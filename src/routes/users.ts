import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import accountsRoutes from './accounts';
import budgetsRoutes from './budgets';
import goalsRoutes from './goals';
import transactionsRoutes from './transactions';
import notificationsRoutes from './notifications';
import tagsRoutes from './tags';
import expensesRoutes from './expenses';
import { prisma } from '../config/database';
import { serialize } from '../utils/serializers';
import { logger } from '../config/logger';

const router = Router();

// Get current user information
router.get('/current', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.context?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Serialize with BigInt handling and snake_case conversion
    res.json(serialize({
      id: user.id,
      partnerId: user.partnerId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Nested account routes
router.use('/:userId/accounts', authenticateJWT, accountsRoutes);

// Nested budget routes
router.use('/:userId/budgets', authenticateJWT, budgetsRoutes);

// Nested goals routes (payoff_goals and savings_goals)
router.use('/:userId', authenticateJWT, goalsRoutes);

// Nested transaction routes
router.use('/:userId/transactions', authenticateJWT, transactionsRoutes);

// Nested notifications routes (under /users/:userId/alerts/notifications)
router.use('/:userId/alerts/notifications', authenticateJWT, notificationsRoutes);

// Nested tags routes
router.use('/:userId/tags', authenticateJWT, tagsRoutes);

// Nested expenses routes
router.use('/:userId/expenses', authenticateJWT, expensesRoutes);

// Stub endpoints for responsive-tiles compatibility
// These return empty responses to prevent frontend errors

// Informational messages (notifications/tips for users)
router.get('/:userId/informational_messages', authenticateJWT, (req: Request, res: Response) => {
  res.json({ informational_messages: [] });
});

// Track login activity
router.post('/current/track_login', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.context?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { updatedAt: new Date() }
    });

    logger.info({ userId }, 'User login tracked');
    return res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to track login');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Harvest status (account aggregation from financial institutions)
router.get('/:userId/harvest', authenticateJWT, (req: Request, res: Response) => {
  res.json({ harvest: null });
});

// Additional user endpoints will be added here
// PUT /users/current
// GET /users/:userId
// etc.

export default router;
