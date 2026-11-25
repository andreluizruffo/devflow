import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

// Short-lived access token. It carries only the user id ("sub"): organization and role
// are always read from the database, so a stale token can never grant old permissions.
export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): string {
  try {
    // Pinning the algorithm blocks tokens signed with "none" or another algorithm.
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });

    if (typeof payload === 'string' || !payload.sub) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
    }

    return payload.sub;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Access token expired');
    }
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
  }
}
