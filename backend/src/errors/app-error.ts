// An expected error with an HTTP status and a stable code the frontend can rely on.
// Anything that is NOT an AppError is treated as a bug and returns 500.
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
