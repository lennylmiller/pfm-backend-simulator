import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as expensesController from '../controllers/expensesController';

const router = Router({ mergeParams: true });

// All expenses endpoints require authentication
router.get('/', authenticateJWT, expensesController.getExpensesSummary);
router.get('/categories', authenticateJWT, expensesController.getExpensesByCategory);
router.get('/merchants', authenticateJWT, expensesController.getExpensesByMerchant);
router.get('/tags/:tagId', authenticateJWT, expensesController.getExpensesByTag);
router.get('/trends', authenticateJWT, expensesController.getExpensesTrends);
router.get('/comparison', authenticateJWT, expensesController.getExpensesComparison);

export default router;
