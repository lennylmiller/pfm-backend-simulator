/**
 * Goals Routes
 * Routes for payoff and savings goals
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as goalsController from '../controllers/goalsController';

const router = Router({ mergeParams: true });

// =============================================================================
// PAYOFF GOALS
// =============================================================================

// GET /users/:userId/payoff_goals
router.get('/payoff_goals', authenticateJWT, goalsController.listPayoffGoals);

// GET /users/:userId/payoff_goals/:id
router.get('/payoff_goals/:id', authenticateJWT, goalsController.getPayoffGoal);

// POST /users/:userId/payoff_goals
router.post('/payoff_goals', authenticateJWT, goalsController.createPayoffGoal);

// PUT /users/:userId/payoff_goals/:id
router.put('/payoff_goals/:id', authenticateJWT, goalsController.updatePayoffGoal);

// DELETE /users/:userId/payoff_goals/:id
router.delete('/payoff_goals/:id', authenticateJWT, goalsController.deletePayoffGoal);

// PUT /users/:userId/payoff_goals/:id/archive
router.put('/payoff_goals/:id/archive', authenticateJWT, goalsController.archivePayoffGoal);

// =============================================================================
// SAVINGS GOALS
// =============================================================================

// GET /users/:userId/savings_goals
router.get('/savings_goals', authenticateJWT, goalsController.listSavingsGoals);

// GET /users/:userId/savings_goals/:id
router.get('/savings_goals/:id', authenticateJWT, goalsController.getSavingsGoal);

// POST /users/:userId/savings_goals
router.post('/savings_goals', authenticateJWT, goalsController.createSavingsGoal);

// PUT /users/:userId/savings_goals/:id
router.put('/savings_goals/:id', authenticateJWT, goalsController.updateSavingsGoal);

// DELETE /users/:userId/savings_goals/:id
router.delete('/savings_goals/:id', authenticateJWT, goalsController.deleteSavingsGoal);

// PUT /users/:userId/savings_goals/:id/archive
router.put('/savings_goals/:id/archive', authenticateJWT, goalsController.archiveSavingsGoal);

export default router;
