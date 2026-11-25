import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env';
import { AppError } from '../../errors/app-error';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { authService, type Session } from './auth.service';

// The refresh token lives in an httpOnly cookie: JavaScript in the page cannot read it,
// so an XSS bug cannot steal it. SameSite=Strict keeps other sites from sending it.
const REFRESH_COOKIE = 'devflow_refresh';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
};

function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

// The access token goes in the JSON body (the frontend keeps it in memory only);
// the refresh token goes in the cookie and never appears in the body.
function sendSession(res: Response, status: number, session: Session): void {
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...refreshCookieOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
  res.status(status).json({ accessToken: session.accessToken, user: session.user });
}

export async function register(req: Request, res: Response): Promise<void> {
  const session = await authService.register(req.body as RegisterInput);
  sendSession(res, 201, session);
}

export async function login(req: Request, res: Response): Promise<void> {
  const session = await authService.login(req.body as LoginInput);
  sendSession(res, 200, session);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const session = await authService.refresh(readRefreshCookie(req));
    sendSession(res, 200, session);
  } catch (error) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    throw error;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(readRefreshCookie(req));
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.status(204).end();
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Missing access token');
  const user = await authService.getProfile(req.userId);
  res.status(200).json({ user });
}
