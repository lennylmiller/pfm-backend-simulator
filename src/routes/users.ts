import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import accountsRoutes from './accounts';

const router = Router();

// Nested account routes
router.use('/:userId/accounts', authenticateJWT, accountsRoutes);

// User-level routes will be added here
// GET /users/current
// PUT /users/current
// etc.

export default router;
