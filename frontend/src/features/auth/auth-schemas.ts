import { z } from 'zod';

// Same rules as the API (backend/src/modules/auth/auth.schemas.ts), so most mistakes are
// caught before a request is sent. The API still validates everything on its own.

const email = z.string().trim().min(1, 'Email is required').pipe(z.email('Invalid email'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must have at least 2 characters').max(80),
  organizationName: z
    .string()
    .trim()
    .min(2, 'Organization name must have at least 2 characters')
    .max(80),
  email,
  password: z
    .string()
    .min(8, 'Password must have at least 8 characters')
    .max(72, 'Password must have at most 72 characters'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
