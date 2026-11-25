// Small fetch wrapper: adds the access token, refreshes it once when it expires and
// turns API errors ({ error: { code, message } }) into ApiError instances.

export type Organization = {
  id: string;
  name: string;
  slug: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
};

export type User = {
  id: string;
  name: string;
  email: string;
  organizations: Organization[];
};

export type AuthResponse = { accessToken: string; user: User };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// The access token lives only in memory (never localStorage), so a malicious script
// cannot read it from storage. After a page reload it is recovered through the
// httpOnly refresh cookie (see refreshSession).
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let refreshInFlight: Promise<AuthResponse | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(
      response.status,
      body.error?.code ?? 'UNKNOWN_ERROR',
      body.error?.message ?? 'Request failed',
    );
  } catch {
    return new ApiError(response.status, 'UNKNOWN_ERROR', 'Request failed');
  }
}

// Only ONE refresh runs at a time. Parallel callers (or React StrictMode running an
// effect twice in development) share the same request. Without this, the second call
// would reuse an already-rotated token and the API would revoke the whole session.
export function refreshSession(): Promise<AuthResponse | null> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        accessToken = null;
        return null;
      }
      const session = (await response.json()) as AuthResponse;
      accessToken = session.accessToken;
      return session;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// Endpoints where a 401 means "wrong credentials / no session", not "token expired".
const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
  });

  // Expired access token: refresh once, then repeat the original request.
  if (response.status === 401 && !isRetry && !NO_RETRY_PATHS.includes(path)) {
    const session = await refreshSession();
    if (session) return apiRequest<T>(path, options, true);
    onSessionExpired?.();
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}
