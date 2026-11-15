import type { BreakState } from '@mocha/core';

/**
 * Whether a break state change should open or close the ritual bubble. It
 * opens for a planned break: accepted, shared from the Tower or after a
 * focus session. A break that began when the user walked away has no
 * length (it ends when they return), and nobody would see the bubble.
 */
export function ritualTransition(
  next: BreakState,
  previous: BreakState,
): 'open' | 'close' | undefined {
  if (next.phase === 'onBreak' && previous.phase !== 'onBreak') {
    return next.endsAt > next.startedAt ? 'open' : undefined;
  }
  if (next.phase !== 'onBreak' && previous.phase === 'onBreak') return 'close';
  return undefined;
}
