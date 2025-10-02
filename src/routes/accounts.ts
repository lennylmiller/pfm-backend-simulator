import { Router } from 'express';
import * as accountsController from '../controllers/accountsController';

const router = Router({ mergeParams: true });

// GET /users/:userId/accounts/all
router.get('/all', accountsController.getAllAccounts);

// GET /users/:userId/accounts/:id
router.get('/:id', accountsController.getAccount);

// PUT /users/:userId/accounts/:id
router.put('/:id', accountsController.updateAccount);

// PUT /users/:userId/accounts/:id/archive
router.put('/:id/archive', accountsController.archiveAccount);

// DELETE /users/:userId/accounts/:id
router.delete('/:id', accountsController.deleteAccount);

export default router;
