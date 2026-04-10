import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: JwtPayload & { userId?: string; email?: string; name?: string };
    }
  }
}

export {};
