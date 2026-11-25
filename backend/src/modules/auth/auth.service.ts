import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { AppError } from '../../errors/app-error';
import { Prisma } from '../../generated/prisma/client';
import { signAccessToken } from '../../lib/jwt';
import { hashPassword, verifyPassword } from '../../lib/password';
import { generateRefreshToken, hashToken } from '../../lib/tokens';
import { userRepository, type UserProfileRecord } from '../users/user.repository';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { refreshTokenRepository } from './refresh-token.repository';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  organizations: { id: string; name: string; slug: string; role: string }[];
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};

// Same message for "unknown email" and "wrong password": the API never reveals
// which emails have an account.
const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

const invalidRefreshToken = () =>
  new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session expired, please log in again');

// Compared against when the email does not exist, so a login for an unknown email
// takes about as long as one with a wrong password (no timing hint either).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

function toProfile(record: UserProfileRecord): UserProfile {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    organizations: record.memberships.map((membership) => ({
      ...membership.organization,
      role: membership.role,
    })),
  };
}

function slugify(text: string): string {
  const base = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  // A short random suffix keeps slugs unique even for organizations with the same name.
  return `${base || 'org'}-${randomBytes(3).toString('hex')}`;
}

async function createSession(record: UserProfileRecord): Promise<Session> {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await refreshTokenRepository.create({
    userId: record.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return { accessToken: signAccessToken(record.id), refreshToken, user: toProfile(record) };
}

async function loadProfileOrFail(userId: string): Promise<UserProfileRecord> {
  const record = await userRepository.findProfileById(userId);
  if (!record) throw new AppError(401, 'UNAUTHENTICATED', 'User no longer exists');
  return record;
}

export const authService = {
  async register(input: RegisterInput): Promise<Session> {
    if (await userRepository.findByEmail(input.email)) {
      throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
    }

    try {
      const record = await userRepository.createWithOrganization({
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        organizationName: input.organizationName,
        organizationSlug: slugify(input.organizationName),
      });
      return await createSession(record);
    } catch (error) {
      // Two simultaneous sign-ups with the same email: the unique index decides.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
      }
      throw error;
    }
  },

  async login(input: LoginInput): Promise<Session> {
    const user = await userRepository.findByEmail(input.email);
    const passwordMatches = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) throw invalidCredentials();

    return createSession(await loadProfileOrFail(user.id));
  },

  // Rotation: every refresh revokes the token used and issues a new one.
  async refresh(rawToken: string | undefined): Promise<Session> {
    if (!rawToken) throw invalidRefreshToken();

    const stored = await refreshTokenRepository.findByHash(hashToken(rawToken));
    if (!stored || stored.expiresAt <= new Date()) throw invalidRefreshToken();

    // A token that was already used is being used again: it was probably stolen.
    // Revoke every session of this user so the attacker's copy dies too.
    const revokedNow =
      stored.revokedAt === null && (await refreshTokenRepository.revokeIfActive(stored.id));
    if (!revokedNow) {
      await refreshTokenRepository.revokeAllForUser(stored.userId);
      throw invalidRefreshToken();
    }

    return createSession(await loadProfileOrFail(stored.userId));
  },

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) await refreshTokenRepository.revokeByHash(hashToken(rawToken));
  },

  async getProfile(userId: string): Promise<UserProfile> {
    return toProfile(await loadProfileOrFail(userId));
  },
};
