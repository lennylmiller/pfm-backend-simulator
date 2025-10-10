/**
 * Express type augmentation
 * Extends Express Request type with custom context property
 */

import { AuthContext } from './auth';

declare global {
  namespace Express {
    interface Request {
      context?: AuthContext;
    }
  }
}

// This export makes this file a module
export {};
