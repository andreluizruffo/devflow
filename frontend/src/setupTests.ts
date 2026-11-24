import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount whatever a test rendered, so one test never sees another test's DOM.
afterEach(() => {
  cleanup();
});
