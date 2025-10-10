import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as transactionsController from '../controllers/transactionsController';

const router = Router({ mergeParams: true });

// GET /users/:userId/transactions (list all transactions - primary endpoint)
router.get('/', authenticateJWT, transactionsController.listTransactions);

// POST /users/:userId/transactions
router.post('/', authenticateJWT, transactionsController.createTransaction);

// GET /users/:userId/transactions/search (advanced search with filters)
router.get('/search', authenticateJWT, transactionsController.searchTransactions);

// PUT /users/:userId/transactions/:id
router.put('/:id', authenticateJWT, transactionsController.updateTransaction);

// DELETE /users/:userId/transactions/:id
router.delete('/:id', authenticateJWT, transactionsController.deleteTransaction);

export default router;
