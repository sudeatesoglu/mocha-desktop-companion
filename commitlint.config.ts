import type { UserConfig } from '@commitlint/types';

/**
 * Commit message rules (Conventional Commits 1.0).
 * Keep the scope list in sync with CONTRIBUTING.md.
 */
const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'app',
        'ui',
        'pet',
        'tracker',
        'api',
        'db',
        'docs',
        'readme',
        'ci',
        'deps',
        'release',
        'config',
        'test',
      ],
    ],
    // GitHub appends " (#123)" to squash-merge titles, so keep headroom
    // above the 72-char guideline for the summary itself.
    'header-max-length': [2, 'always', 100],
  },
};

export default config;
