import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import accountsRoutes from './accounts';
import { prisma } from '../config/database';
import { serialize } from '../utils/serializers';

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

// Stub endpoints for responsive-tiles compatibility
// These return empty responses to prevent frontend errors

// Informational messages (notifications/tips for users)
router.get('/:userId/informational_messages', authenticateJWT, (req: Request, res: Response) => {
  res.json({ informational_messages: [] });
});

// Alert notifications
router.get('/:userId/alerts/notifications', authenticateJWT, (req: Request, res: Response) => {
  res.json({ notifications: [] });
});

// Track login activity (no-op for simulator)
router.post('/current/track_login', authenticateJWT, (req: Request, res: Response) => {
  res.json({ success: true });
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
