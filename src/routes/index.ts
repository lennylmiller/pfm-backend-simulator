import { Router } from 'express';
import accountsRoutes from './accounts';
import usersRoutes from './users';
import partnersRoutes from './partners';
import budgetsRoutes from './budgets';
import tagsRoutes from './tags';
import stubRoutes from './stubs';

const router = Router();

// Mount routes
router.use('/users', usersRoutes);
router.use('/partners', partnersRoutes);

// Mount default tags route (no userId)
router.use('/tags', tagsRoutes);

// Mount stub routes for endpoints not yet implemented
router.use('/', stubRoutes);

export default router;
