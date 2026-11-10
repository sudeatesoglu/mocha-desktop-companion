import type { BreakState } from '@mocha/core';

/**
 * Whether a break state change should open or close the reminder. It opens
 * when a break becomes due and closes when the state leaves "due" for any
 * reason: a choice, the user walking away, or a pause.
 */
export function reminderTransition(
  next: BreakState,
  previous: BreakState,
): 'open' | 'close' | undefined {
  if (next.phase === 'due' && previous.phase !== 'due') return 'open';
  if (next.phase !== 'due' && previous.phase === 'due') return 'close';
  return undefined;
}
