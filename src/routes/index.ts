import { Router } from 'express';
import accountsRoutes from './accounts';
import usersRoutes from './users';
import partnersRoutes from './partners';

const router = Router();

// Mount routes
router.use('/users', usersRoutes);
router.use('/partners', partnersRoutes);

// Accounts are nested under users
// Additional routes will be added here

export default router;
