import { defineProject, mergeConfig } from 'vitest/config';
import { sharedProjectConfig } from '../../vitest.shared.ts';

export default mergeConfig(
  sharedProjectConfig,
  defineProject({
    test: {
      name: 'desktop',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  }),
);
