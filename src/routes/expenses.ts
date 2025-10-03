import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as expensesController from '../controllers/expensesController';

const router = Router({ mergeParams: true });

// GET /users/:userId/expenses
router.get('/', authenticateJWT, expensesController.getExpenses);

export default router;
