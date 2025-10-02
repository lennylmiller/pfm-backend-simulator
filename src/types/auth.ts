export interface JWTPayload {
  userId: string;
  partnerId: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  userId: string;
  partnerId: string;
}

declare global {
  namespace Express {
    interface Request {
      context?: AuthContext;
    }
  }
}
