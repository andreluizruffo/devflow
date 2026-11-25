import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

// Validates and normalizes req.body with a Zod schema before the controller runs.
// Invalid data throws a ZodError, which the error handler turns into a 400 response.
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}
