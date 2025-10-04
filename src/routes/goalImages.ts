/**
 * Goal Images Routes
 * Static goal image endpoints (no authentication required)
 */

import { Router } from 'express';
import * as goalsController from '../controllers/goalsController';

const router = Router();

// GET /payoff_goals - List available payoff goal images
router.get('/payoff_goals', goalsController.listPayoffGoalImages);

// GET /savings_goals - List available savings goal images
router.get('/savings_goals', goalsController.listSavingsGoalImages);

export default router;
