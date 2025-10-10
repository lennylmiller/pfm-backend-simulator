/**
 * Authentication Routes
 */

import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

// POST /auth/login
router.post('/login', authController.login);

// POST /auth/logout
router.post('/logout', authController.logout);

export default router;
