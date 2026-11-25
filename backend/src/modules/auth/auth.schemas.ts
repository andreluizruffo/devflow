import { z } from 'zod';

// Emails are trimmed and lowercased so "Ana@Mail.com " and "ana@mail.com" are the same account.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Invalid email' }));

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must have at least 2 characters').max(80),
  email,
  // bcrypt only uses the first 72 bytes of a password, so longer ones are rejected.
  password: z
    .string()
    .min(8, 'Password must have at least 8 characters')
    .max(72, 'Password must have at most 72 characters'),
  organizationName: z
    .string()
    .trim()
    .min(2, 'Organization name must have at least 2 characters')
    .max(80),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
