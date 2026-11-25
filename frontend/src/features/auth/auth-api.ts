import { apiRequest, type AuthResponse } from '../../lib/api';
import type { LoginValues, RegisterValues } from './auth-schemas';

export const authApi = {
  login: (values: LoginValues) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: values }),

  register: (values: RegisterValues) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: values }),

  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
};
