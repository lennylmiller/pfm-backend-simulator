/**
 * Stub endpoints for features not yet implemented
 * These return empty data structures to prevent 404 errors
 * and allow the frontend to load successfully
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Cashflow endpoints
router.get('/users/:userId/cashflow', authenticateJWT, (req: Request, res: Response) => {
  res.json({
    cashflow: {
      balance: "0.00",
      projected_balance: "0.00",
      income: "0.00",
      expenses: "0.00"
    }
  });
});

router.get('/users/:userId/cashflow/events', authenticateJWT, (req: Request, res: Response) => {
  res.json({ cashflow_events: [] });
});

// potential_cashflow moved to accounts.ts router to avoid conflict with /:id route

// Expenses endpoint
router.get('/users/:userId/expenses', authenticateJWT, (req: Request, res: Response) => {
  res.json({ expenses: [] });
});

// Net worth endpoint
router.get('/users/:userId/networth', authenticateJWT, (req: Request, res: Response) => {
  res.json({
    networth: {
      assets: "0.00",
      debts: "0.00",
      total: "0.00"
    }
  });
});

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
