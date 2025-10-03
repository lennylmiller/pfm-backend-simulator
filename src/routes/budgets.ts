import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as budgetsController from '../controllers/budgetsController';

const router = Router({ mergeParams: true });

// GET /users/:userId/budgets/:id
router.get('/:id', authenticateJWT, budgetsController.getBudget);

// GET /users/:userId/budgets
router.get('/', authenticateJWT, budgetsController.getBudgets);

// POST /users/:userId/budgets
router.post('/', authenticateJWT, budgetsController.createBudget);

// PUT /users/:userId/budgets/:id
router.put('/:id', authenticateJWT, budgetsController.updateBudget);

// DELETE /users/:userId/budgets/:id
router.delete('/:id', authenticateJWT, budgetsController.deleteBudget);

export default router;
