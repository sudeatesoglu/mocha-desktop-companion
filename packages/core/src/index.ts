/**
 * Public API of @mocha/core.
 *
 * Other packages import only from here, never from internal paths, so the
 * internals can be reorganized without breaking consumers.
 */
export const APP_NAME = 'Mocha';

export function greet(name: string): string {
  return `Hi ${name}, I'm ${APP_NAME}!`;
}

export { formatDuration } from './time/format-duration.ts';
