import express from 'express';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { healthRouter } from './modules/health/health.routes';

// Builds the Express app without starting the server, so tests can use it with Supertest.
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/health', healthRouter);

  // Order matters: these two must come after every route.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
