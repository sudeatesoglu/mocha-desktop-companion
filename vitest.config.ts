import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each workspace package is a Vitest project with its own vitest.config.ts.
    // Projects do NOT inherit test options from this file; shared options
    // live in vitest.shared.ts. Only repo-wide settings belong here.
    projects: ['packages/*', 'apps/*'],
    // Coverage is global: one report and one set of thresholds for the repo.
    coverage: {
      provider: 'v8',
      include: ['{packages,apps}/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.{test,spec}.{ts,tsx}',
        '**/__tests__/**',
        // Entry points (composition roots) only wire modules together and
        // need a running Electron app. They are left to end-to-end tests;
        // keep logic out of them so it stays unit-tested.
        'apps/desktop/src/{main,preload,renderer}/index.ts',
      ],
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
