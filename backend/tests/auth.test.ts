import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDatabase } from './helpers/db';

const app = createApp();

const validUser = {
  name: 'Ana Souza',
  email: 'Ana@Example.com ',
  password: 'correct-horse-battery',
  organizationName: 'Ana Studio',
};

function getRefreshCookie(response: request.Response): string {
  const cookies = ([] as string[]).concat(response.headers['set-cookie'] ?? []);
  const cookie = cookies.find((value) => value.startsWith('devflow_refresh='));
  if (!cookie) throw new Error('Refresh cookie was not set');
  return cookie.split(';')[0] as string;
}

async function registerUser() {
  const response = await request(app).post('/api/auth/register').send(validUser);
  expect(response.status).toBe(201);
  return response;
}

beforeEach(resetDatabase);

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates the user, an organization and an OWNER membership', async () => {
    const response = await registerUser();

    expect(response.body).toEqual({
      accessToken: expect.any(String),
      user: {
        id: expect.any(String),
        name: 'Ana Souza',
        email: 'ana@example.com', // trimmed and lowercased
        organizations: [
          { id: expect.any(String), name: 'Ana Studio', slug: expect.any(String), role: 'OWNER' },
        ],
      },
    });
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await registerUser();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@example.com' } });

    expect(user.passwordHash).not.toBe(validUser.password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('sets the refresh token as an httpOnly, SameSite=Strict cookie and keeps it out of the body', async () => {
    const response = await registerUser();
    const cookies = ([] as string[]).concat(response.headers['set-cookie'] ?? []);
    const cookie = cookies.find((value) => value.startsWith('devflow_refresh=')) ?? '';

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/auth/i);
    expect(response.body).not.toHaveProperty('refreshToken');
  });

  it('returns 409 when the email is already registered', async () => {
    await registerUser();
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'ana@example.com' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('returns 400 with field details for invalid data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short', organizationName: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
    expect(fields).toEqual(
      expect.arrayContaining(['name', 'email', 'password', 'organizationName']),
    );
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the right credentials (email is case-insensitive)', async () => {
    await registerUser();
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ANA@example.com', password: validUser.password });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe('ana@example.com');
  });

  it('gives the same 401 for a wrong password and for an unknown email', async () => {
    await registerUser();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the profile for a valid access token, without the password hash', async () => {
    const { body } = await registerUser();
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('ana@example.com');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('returns 401 without a token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 for a tampered token', async () => {
    const { body } = await registerUser();
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}x`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues a new access token and rotates the refresh token', async () => {
    const registered = await registerUser();
    const firstCookie = getRefreshCookie(registered);

    const response = await request(app).post('/api/auth/refresh').set('Cookie', firstCookie);

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(getRefreshCookie(response)).not.toBe(firstCookie);
  });

  it('detects reuse of an old refresh token and revokes every session of the user', async () => {
    const registered = await registerUser();
    const stolenCookie = getRefreshCookie(registered);

    // The real user refreshes: the first token is now revoked, a new one is active.
    const rotated = await request(app).post('/api/auth/refresh').set('Cookie', stolenCookie);
    const currentCookie = getRefreshCookie(rotated);

    // Someone replays the old token...
    const replay = await request(app).post('/api/auth/refresh').set('Cookie', stolenCookie);
    expect(replay.status).toBe(401);

    // ...and the legitimate session is killed too, forcing a fresh login.
    const afterReuse = await request(app).post('/api/auth/refresh').set('Cookie', currentCookie);
    expect(afterReuse.status).toBe(401);
  });

  it('returns 401 without a cookie', async () => {
    const response = await request(app).post('/api/auth/refresh');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token so it cannot be used again', async () => {
    const registered = await registerUser();
    const cookie = getRefreshCookie(registered);

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(204);

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(401);
  });
});
