import type { BreakState } from '../habits/break-machine.ts';
import type { NeedsActivity, NeedsEvent } from './needs.ts';

/** What the user is doing in a break state, as far as Mocha's needs care. */
export function needsActivity(state: BreakState): NeedsActivity {
  switch (state.phase) {
    case 'working':
    case 'due':
      return 'work';
    case 'onBreak':
      return 'rest';
    case 'paused':
      return 'paused';
  }
}

/**
 * The needs events for a change of break state at `now`.
 *
 * Time since the last update is applied first. Entering a break counts it
 * as rest: the change can come after a long gap without updates, such as a
 * night with the lid closed, which must not count as work. A break that
 * ends is reported with its length, so a long enough one lifts Mocha's mood.
 */
export function needsEventsForBreakChange(
  previous: BreakState,
  next: BreakState,
  now: number,
): NeedsEvent[] {
  const activity = next.phase === 'onBreak' ? 'rest' : needsActivity(previous);
  const events: NeedsEvent[] = [{ type: 'elapse', now, activity }];
  if (previous.phase === 'onBreak' && next.phase !== 'onBreak') {
    events.push({ type: 'breakCompleted', durationMs: Math.max(0, now - previous.startedAt) });
  }
  return events;
}
