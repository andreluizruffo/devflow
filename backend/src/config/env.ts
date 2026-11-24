import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

// Loads the repo-root .env in development. Variables that already exist (set by the
// shell, CI or the hosting platform) are never overwritten.
config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

// Validates environment variables once, at startup. If something is missing or wrong,
// the API refuses to start instead of failing later in the middle of a request.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.issues);
  process.exit(1);
}

export const env = parsed.data;
