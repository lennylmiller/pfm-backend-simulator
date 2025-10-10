/**
 * Tags Routes
 * Routes for tag operations (both system and user tags)
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as tagsController from '../controllers/tagsController';

const router = Router({ mergeParams: true });

// GET /users/:userId/tags - Get all tags accessible to user with transaction counts
router.get('/', authenticateJWT, tagsController.listUserTags);

// PUT /users/:userId/tags - Bulk create/update/delete operations
router.put('/', authenticateJWT, tagsController.bulkUpdateTags);

export default router;
