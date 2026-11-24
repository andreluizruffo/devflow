import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma commands run from backend/ (via npm scripts); the .env file lives at the repo root.
config({ path: '../.env', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
