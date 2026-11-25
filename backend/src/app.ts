import cookieParser from 'cookie-parser';
import express, { Router } from 'express';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { healthRouter } from './modules/health/health.routes';

// Builds the Express app without starting the server, so tests can use it with Supertest.
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Every endpoint lives under /api, so the frontend and the API can share one domain.
  const api = Router();
  api.use('/health', healthRouter);
  api.use('/auth', authRouter);
  app.use('/api', api);

  // Order matters: these two must come after every route.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
