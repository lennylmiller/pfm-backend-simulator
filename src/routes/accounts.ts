import { Router } from 'express';
import * as accountsController from '../controllers/accountsController';

const router = Router({ mergeParams: true });

// GET /users/:userId/accounts (list all accounts - primary endpoint)
router.get('/', accountsController.getAllAccounts);

// POST /users/:userId/accounts
router.post('/', accountsController.createAccount);

// GET /users/:userId/accounts/all (alias for compatibility)
router.get('/all', accountsController.getAllAccounts);

// GET /users/:userId/accounts/potential_cashflow (must be before /:id to avoid conflict)
router.get('/potential_cashflow', accountsController.getPotentialCashflowAccounts);

// GET /users/:userId/accounts/:id/investments
router.get('/:id/investments', accountsController.getAccountInvestments);

// GET /users/:userId/accounts/:id/transactions
router.get('/:id/transactions', accountsController.getAccountTransactions);

// GET /users/:userId/accounts/:id
router.get('/:id', accountsController.getAccount);

// PUT /users/:userId/accounts/:id
router.put('/:id', accountsController.updateAccount);

// PUT /users/:userId/accounts/:id/archive
router.put('/:id/archive', accountsController.archiveAccount);

// DELETE /users/:userId/accounts/:id
router.delete('/:id', accountsController.deleteAccount);

export default router;
