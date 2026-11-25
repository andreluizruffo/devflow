import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  refreshSession,
  setAccessToken,
  setSessionExpiredHandler,
  type AuthResponse,
  type User,
} from '../../lib/api';
import { authApi } from './auth-api';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

type AuthState = { status: AuthStatus; user: User | null };

const SIGNED_OUT: AuthState = { status: 'unauthenticated', user: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
  const queryClient = useQueryClient();

  // On page load, try to restore the session from the httpOnly refresh cookie.
  useEffect(() => {
    let active = true;

    void refreshSession().then((session) => {
      if (active) setState(session ? { status: 'authenticated', user: session.user } : SIGNED_OUT);
    });

    // If a later refresh fails (session revoked or expired), send the user to login.
    setSessionExpiredHandler(() => setState(SIGNED_OUT));

    return () => {
      active = false;
      setSessionExpiredHandler(null);
    };
  }, []);

  const startSession = useCallback((session: AuthResponse) => {
    setAccessToken(session.accessToken);
    setState({ status: 'authenticated', user: session.user });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: async (values) => startSession(await authApi.login(values)),
      signUp: async (values) => startSession(await authApi.register(values)),
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          // Even if the request fails, forget everything locally.
          setAccessToken(null);
          queryClient.clear();
          setState(SIGNED_OUT);
        }
      },
    }),
    [state, startSession, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
