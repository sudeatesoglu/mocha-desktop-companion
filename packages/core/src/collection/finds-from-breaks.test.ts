import { describe, expect, it } from 'vitest';
import { type BreakState, startWorking } from '../habits/break-machine.ts';
import { findsEventForBreakChange } from './finds-from-breaks.ts';

const MINUTE = 60_000;
const onBreak: BreakState = {
  phase: 'onBreak',
  startedAt: 50 * MINUTE,
  endsAt: 60 * MINUTE,
  workStartedAt: 10 * MINUTE,
};

describe('findsEventForBreakChange', () => {
  it('reports a break that ended, with the work before it', () => {
    expect(findsEventForBreakChange(onBreak, startWorking(62 * MINUTE), 62 * MINUTE, true)).toEqual(
      {
        type: 'breakEnded',
        now: 62 * MINUTE,
        workMs: 40 * MINUTE,
        breakMs: 12 * MINUTE,
        ritual: true,
      },
    );
  });

  it('counts a break ended by a pause or a focus session too', () => {
    expect(
      findsEventForBreakChange(onBreak, { phase: 'paused' }, 55 * MINUTE, false),
    ).toMatchObject({
      breakMs: 5 * MINUTE,
    });
  });

  it('ignores every other change', () => {
    expect(findsEventForBreakChange(startWorking(0), onBreak, 50 * MINUTE, false)).toBeUndefined();
    expect(findsEventForBreakChange(onBreak, onBreak, 51 * MINUTE, false)).toBeUndefined();
  });

  it('never reports negative times from a clock that moved back', () => {
    expect(findsEventForBreakChange(onBreak, startWorking(0), 40 * MINUTE, false)).toMatchObject({
      breakMs: 0,
    });
  });
});
