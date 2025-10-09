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
// Transactions search endpoint now implemented in transactions.ts
// Budgets endpoints now implemented in budgets.ts and users.ts

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

// Partner config.json endpoint
// Returns minimal partner configuration for responsive-tiles frontend
router.get('/assets/config/:partnerId/config.json', (req: Request, res: Response) => {
  const { partnerId } = req.params;

  // Minimal config to allow frontend to load
  const config = {
    partner_id: partnerId,
    features: {
      accounts: true,
      budgets: true,
      cashflow: true,
      transactions: true,
      goals: true,
      alerts: true,
      networth: true,
    },
    branding: {
      name: 'PFM Simulator',
      logo_url: null,
      primary_color: '#4e879f',
    }
  };

  res.json(config);
});

export default router;
