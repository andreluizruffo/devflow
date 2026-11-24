/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  // The generated Prisma client imports "./file.js"; in tests Jest loads the .ts source instead.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  // Test files share one database, so they run one at a time.
  maxWorkers: 1,
};
