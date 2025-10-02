/**
 * Stub endpoints for features not yet implemented
 * These return empty data structures to prevent 404 errors
 * and allow the frontend to load successfully
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Goals endpoints with sample data
router.get('/users/:userId/payoff_goals', authenticateJWT, (req: Request, res: Response) => {
  res.json({
    payoff_goals: [{
      id: 13949,
      name: "Pay off a credit card",
      state: "active",
      status: "under",
      percent_complete: 0,
      target_completion_on: "2026-05-01",
      image_name: "credit_card.jpg",
      created_at: "2025-05-01T19:37:39.000Z",
      updated_at: "2025-10-02T08:09:23.000Z",
      image_url: "https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg",
      links: { accounts: [39923316] },
      initial_value: "501.29",
      current_value: "1002.09",
      target_value: "0.00",
      monthly_contribution: "70.00",
      remaining_monthly_contribution: "140.00",
      target_contribution: null,
      current_progress: "-500.80",
      complete: false
    }]
  });
});

router.get('/users/:userId/savings_goals', authenticateJWT, (req: Request, res: Response) => {
  res.json({
    savings_goals: [{
      id: 20360,
      name: "Save for a vacation",
      state: "active",
      status: "under",
      percent_complete: 94,
      target_completion_on: "2026-08-01",
      image_name: "vacation.jpg",
      created_at: "2025-05-01T19:40:00.000Z",
      updated_at: "2025-05-01T19:40:00.000Z",
      image_url: "https://content.geezeo.com/images/savings_goal_images/vacation.jpg",
      links: { accounts: [39922424] },
      initial_value: "9357.24",
      current_value: "9357.24",
      target_value: "10000.00",
      monthly_contribution: "60.00",
      remaining_monthly_contribution: "60.00",
      target_contribution: null,
      current_progress: "0.00",
      complete: false
    }]
  });
});

router.get('/payoff_goals', authenticateJWT, (req: Request, res: Response) => {
  res.json({
    payoff_goal_images: [
      { id: "credit_card.jpg", name: "Pay off a credit card", url: "https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg" },
      { id: "loan.jpg", name: "Pay off loans", url: "https://content.geezeo.com/images/payoff_goal_images/loan.jpg" },
      { id: "payoff_goal.jpg", name: "Custom payoff goal", url: "https://content.geezeo.com/images/payoff_goal_images/payoff_goal.jpg" }
    ]
  });
});

router.get('/savings_goals', authenticateJWT, (req: Request, res: Response) => {
  res.json({
    savings_goal_images: [
      { id: "baby.jpg", name: "Save for a baby", url: "https://content.geezeo.com/images/savings_goal_images/baby.jpg" },
      { id: "car.jpg", name: "Save for a car", url: "https://content.geezeo.com/images/savings_goal_images/car.jpg" },
      { id: "college.jpg", name: "Save for a college", url: "https://content.geezeo.com/images/savings_goal_images/college.jpg" },
      { id: "cushion.jpg", name: "Create a savings cushion", url: "https://content.geezeo.com/images/savings_goal_images/cushion.jpg" },
      { id: "retirement.jpg", name: "Save for retirement", url: "https://content.geezeo.com/images/savings_goal_images/retirement.jpg" },
      { id: "tv.jpg", name: "Buy something special", url: "https://content.geezeo.com/images/savings_goal_images/tv.jpg" },
      { id: "house.jpg", name: "Save for a house", url: "https://content.geezeo.com/images/savings_goal_images/house.jpg" },
      { id: "vacation.jpg", name: "Save for a vacation", url: "https://content.geezeo.com/images/savings_goal_images/vacation.jpg" },
      { id: "wedding.jpg", name: "Save for a wedding", url: "https://content.geezeo.com/images/savings_goal_images/wedding.jpg" },
      { id: "savings_goal.jpg", name: "Custom savings goal", url: "https://content.geezeo.com/images/savings_goal_images/savings_goal.jpg" }
    ]
  });
});

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

// Tags endpoints
router.get('/tags', authenticateJWT, (req: Request, res: Response) => {
  res.json({ tags: [] });
});

router.get('/users/:userId/tags', authenticateJWT, (req: Request, res: Response) => {
  res.json({ tags: [] });
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
