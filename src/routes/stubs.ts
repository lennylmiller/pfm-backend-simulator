/**
 * Stub endpoints for features not yet implemented
 * These return empty data structures to prevent 404 errors
 * and allow the frontend to load successfully
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Cashflow endpoints now implemented in cashflow.ts
// Expenses endpoints now implemented in expenses.ts
// Networth endpoints now implemented in users.ts

// Transactions endpoint
router.get('/users/:userId/transactions/search', authenticateJWT, (req: Request, res: Response) => {
  res.json({
    transactions: [],
    total_count: 0
  });
});

// Budgets endpoint
router.get('/users/:userId/budgets', authenticateJWT, (req: Request, res: Response) => {
  res.json({ budgets: [] });
});

// Ads endpoint
router.get('/users/:userId/ads', authenticateJWT, (req: Request, res: Response) => {
  res.json({ ads: [] });
});

// Logout endpoint
router.post('/users/:userId/logout', authenticateJWT, (req: Request, res: Response) => {
  res.status(204).send();
});

// Harvest POST endpoint
router.post('/users/:userId/harvest', authenticateJWT, (req: Request, res: Response) => {
  res.status(204).send();
});

export default router;
