import { Router } from 'express';
import accountsRoutes from './accounts';
import usersRoutes from './users';
import partnersRoutes from './partners';
import budgetsRoutes from './budgets';
import tagsRoutes from './tags';
import goalImagesRoutes from './goalImages';
import stubRoutes from './stubs';
import * as tagsController from '../controllers/tagsController';

const router = Router();

// Mount routes
router.use('/users', usersRoutes);
router.use('/partners', partnersRoutes);

// Mount global system tags endpoint (no authentication)
router.get('/tags', tagsController.listSystemTags);

// Mount goal images routes (no authentication, static data)
router.use('/', goalImagesRoutes);

// Mount stub routes for endpoints not yet implemented
router.use('/', stubRoutes);

export default router;
