import { createContext } from 'react';
import type { User } from '../../lib/api';
import type { LoginValues, RegisterValues } from './auth-schemas';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  login: (values: LoginValues) => Promise<void>;
  signUp: (values: RegisterValues) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
