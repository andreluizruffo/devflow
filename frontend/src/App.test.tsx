import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AuthProvider } from './features/auth/AuthProvider';
import { setAccessToken } from './lib/api';

const user = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  organizations: [{ id: 'org-1', name: 'Ana Studio', slug: 'ana-studio', role: 'OWNER' }],
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const noSession = () =>
  json(401, { error: { code: 'INVALID_REFRESH_TOKEN', message: 'Session expired' } });

// Fake API: each key is "METHOD /path". Any other request fails the test.
function mockApi(routes: Record<string, () => Response>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    return handler();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('authentication flow', () => {
  it('sends a visitor without a session to the login page', async () => {
    mockApi({ 'POST /api/auth/refresh': noSession });
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Log in to DevFlow' })).toBeInTheDocument();
  });

  it('restores the session from the refresh cookie and shows the dashboard', async () => {
    mockApi({ 'POST /api/auth/refresh': () => json(200, { accessToken: 'token', user }) });
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Welcome, Ana' })).toBeInTheDocument();
    expect(screen.getByText('Ana Studio')).toBeInTheDocument();
  });

  it('validates the login form without calling the API', async () => {
    const fetchMock = mockApi({ 'POST /api/auth/refresh': noSession });
    renderApp('/login');

    await userEvent.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the initial session check
  });

  it('logs in and opens the dashboard', async () => {
    mockApi({
      'POST /api/auth/refresh': noSession,
      'POST /api/auth/login': () => json(200, { accessToken: 'token', user }),
    });
    renderApp('/login');

    await userEvent.type(await screen.findByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Welcome, Ana' })).toBeInTheDocument();
  });

  it('shows the API message when the credentials are wrong', async () => {
    mockApi({
      'POST /api/auth/refresh': noSession,
      'POST /api/auth/login': () =>
        json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }),
    });
    renderApp('/login');

    await userEvent.type(await screen.findByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});
