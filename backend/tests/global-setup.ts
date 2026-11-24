import { execSync } from 'node:child_process';
import path from 'node:path';
import { config } from 'dotenv';

// Runs once before the whole test suite: applies every migration to the test database.
export default function globalSetup(): void {
  config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: process.env['DATABASE_URL_TEST'] },
    stdio: 'inherit',
  });
}
