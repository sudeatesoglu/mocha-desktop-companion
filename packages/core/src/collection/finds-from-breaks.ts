import type { BreakState } from '../habits/break-machine.ts';
import type { FindsEvent } from './finds.ts';

/**
 * The find meter's event for a change of the break rules: a break that
 * ended at `now`, with the work stretch before it and whether a ritual
 * earned mood in it. Undefined for every other change.
 */
export function findsEventForBreakChange(
  previous: BreakState,
  next: BreakState,
  now: number,
  ritual: boolean,
): FindsEvent | undefined {
  if (previous.phase !== 'onBreak' || next.phase === 'onBreak') return undefined;
  return {
    type: 'breakEnded',
    now,
    workMs: Math.max(0, previous.startedAt - previous.workStartedAt),
    breakMs: Math.max(0, now - previous.startedAt),
    ritual,
  };
}
