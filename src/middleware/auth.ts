import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth';
import { JWTPayload } from '../types/auth';
import { logger } from '../config/logger';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, authConfig.jwtSecret) as any;

    // Support both JWT formats:
    // 1. Standard format: { userId, partnerId }
    // 2. Responsive-tiles format: { sub, iss, aud } where sub=userId, iss=partnerId
    const userId = payload.userId || payload.sub;
    const partnerId = payload.partnerId || payload.iss;

    if (!userId || !partnerId) {
      logger.warn({ payload }, 'JWT missing required claims');
      return res.status(401).json({ error: 'Invalid token claims' });
    }

    // Attach to request context
    req.context = {
      userId: userId,
      partnerId: partnerId,
    };

    logger.debug({ userId }, 'Authenticated request');
    next();
  } catch (error) {
    logger.warn({ error }, 'JWT verification failed');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, authConfig.jwtSecret) as any;

    // Support both JWT formats
    const userId = payload.userId || payload.sub;
    const partnerId = payload.partnerId || payload.iss;

    if (userId && partnerId) {
      req.context = {
        userId: userId,
        partnerId: partnerId,
      };
    }
  } catch (error) {
    // Continue without auth context
  }

  next();
};
