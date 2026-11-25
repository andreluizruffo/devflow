import { createHash, randomBytes } from 'node:crypto';

// Refresh tokens are random strings, not JWTs: they mean nothing by themselves and
// are only valid while their hash exists (and is not revoked) in the database.
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

// SHA-256 is enough here (unlike passwords): the token already has 256 bits of randomness.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
