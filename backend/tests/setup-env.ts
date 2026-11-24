import path from 'node:path';
import { config } from 'dotenv';

// Runs before every test file (jest "setupFiles"): points the app at the TEST database,
// so tests can wipe tables freely without touching development data.
config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const testUrl = process.env['DATABASE_URL_TEST'];

if (!testUrl || !/_test(\?|$)/.test(testUrl)) {
  throw new Error('DATABASE_URL_TEST must be set and point to a database whose name ends in _test');
}

process.env['DATABASE_URL'] = testUrl;
