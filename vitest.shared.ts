import { defineProject } from 'vitest/config';

/**
 * Test options every workspace package must use.
 *
 * Projects do not inherit `test` options from the root vitest.config.ts,
 * so each package's vitest.config.ts merges this config explicitly.
 */
export const sharedProjectConfig = defineProject({
  test: {
    environment: 'node',
    restoreMocks: true,
  },
});
