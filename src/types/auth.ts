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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      context?: AuthContext;
    }
  }
}
