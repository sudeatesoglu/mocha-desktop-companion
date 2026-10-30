import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each workspace package is a Vitest project with its own vitest.config.ts.
    projects: ['packages/*', 'apps/*'],
    restoreMocks: true,
    // Coverage is global: one report and one set of thresholds for the repo.
    coverage: {
      provider: 'v8',
      include: ['{packages,apps}/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
