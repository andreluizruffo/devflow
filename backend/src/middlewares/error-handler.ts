import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env';

// Every error leaves the API with the same JSON shape: { error: { code, message } }.

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  // Outside production the real message helps debugging; in production it is hidden
  // so stack traces and internal details never reach the client.
  const message =
    env.NODE_ENV !== 'production' && err instanceof Error ? err.message : 'Internal server error';

  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
};
