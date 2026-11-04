/**
 * Installs Git hooks via Lefthook as part of `pnpm install`.
 *
 * Skipped when hooks are useless or impossible to install:
 * - in CI, which runs the same checks as workflow steps;
 * - outside a Git checkout (source tarball, container build), where
 *   `lefthook install` would exit with "not a git repository".
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (process.env.CI || !existsSync('.git')) {
  process.exit(0);
}

execFileSync('lefthook', ['install'], {
  stdio: 'inherit',
  // Package binaries are .cmd shims on Windows and need a shell to run.
  shell: process.platform === 'win32',
});
