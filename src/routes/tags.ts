import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as tagsController from '../controllers/tagsController';

const router = Router({ mergeParams: true });

// GET /tags (default tags - no auth required per spec)
router.get('/default', tagsController.getDefaultTags);

// GET /users/:userId/tags
router.get('/', authenticateJWT, tagsController.getUserTags);

// PUT /users/:userId/tags
router.put('/', authenticateJWT, tagsController.updateUserTags);

export default router;
