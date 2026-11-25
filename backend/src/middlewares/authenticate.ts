import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error';
import { verifyAccessToken } from '../lib/jwt';

// Protects a route: requires "Authorization: Bearer <access token>".
// The user id comes ONLY from the verified token, never from the request body or query.
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing access token');
  }

  req.userId = verifyAccessToken(header.slice('Bearer '.length));
  next();
};
