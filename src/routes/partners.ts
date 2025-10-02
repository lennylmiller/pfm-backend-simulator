import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as partnersController from '../controllers/partnersController';

const router = Router();

// GET /partners/current
router.get('/current', authenticateJWT, partnersController.getCurrentPartner);

export default router;
