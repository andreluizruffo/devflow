// Adds the authenticated user's id to Express' Request type (set by the authenticate middleware).
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
