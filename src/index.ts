/**
 * Mocha entry point.
 *
 * Placeholder until the Electron main process is introduced after
 * architecture planning. Kept intentionally small so the toolchain
 * (typecheck, build) has a real module to work with.
 */
export const APP_NAME = 'Mocha';

export function greet(name: string): string {
  return `Hi ${name}, I'm ${APP_NAME}!`;
}
