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
    const payload = jwt.verify(token, authConfig.jwtSecret) as JWTPayload;

    // Attach to request context
    req.context = {
      userId: payload.userId,
      partnerId: payload.partnerId,
    };

    logger.debug({ userId: payload.userId }, 'Authenticated request');
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
    const payload = jwt.verify(token, authConfig.jwtSecret) as JWTPayload;
    req.context = {
      userId: payload.userId,
      partnerId: payload.partnerId,
    };
  } catch (error) {
    // Continue without auth context
  }

  next();
};
