import { describe, expect, it } from 'vitest';
import type { BreakState } from '../habits/break-machine.ts';
import { needsActivity, needsEventsForBreakChange } from './needs-from-breaks.ts';

const MINUTE = 60_000;
const working: BreakState = { phase: 'working', workStartedAt: 0, snoozedUntil: 0 };
const due: BreakState = { phase: 'due', workStartedAt: 0, dueAt: 40 * MINUTE };
const onBreak: BreakState = {
  phase: 'onBreak',
  startedAt: 40 * MINUTE,
  endsAt: 50 * MINUTE,
  workStartedAt: 0,
};
const paused: BreakState = { phase: 'paused' };

describe('needsActivity', () => {
  it.each([
    [working, 'work'],
    [due, 'work'],
    [onBreak, 'rest'],
    [paused, 'paused'],
  ])('maps %o to %s', (state, activity) => {
    expect(needsActivity(state)).toBe(activity);
  });
});

describe('needsEventsForBreakChange', () => {
  it('applies the time so far as the activity that just ended', () => {
    expect(needsEventsForBreakChange(working, due, 40 * MINUTE)).toEqual([
      { type: 'elapse', now: 40 * MINUTE, activity: 'work' },
    ]);
    expect(needsEventsForBreakChange(paused, working, 60 * MINUTE)).toEqual([
      { type: 'elapse', now: 60 * MINUTE, activity: 'paused' },
    ]);
  });

  it('counts the gap before a break as rest, so a night asleep is not work', () => {
    const morning = 10 * 60 * MINUTE;

    expect(needsEventsForBreakChange(working, onBreak, morning)).toEqual([
      { type: 'elapse', now: morning, activity: 'rest' },
    ]);
  });

  it('reports a finished break with its length', () => {
    expect(needsEventsForBreakChange(onBreak, working, 52 * MINUTE)).toEqual([
      { type: 'elapse', now: 52 * MINUTE, activity: 'rest' },
      { type: 'breakCompleted', durationMs: 12 * MINUTE },
    ]);
    expect(needsEventsForBreakChange(onBreak, paused, 45 * MINUTE)).toContainEqual({
      type: 'breakCompleted',
      durationMs: 5 * MINUTE,
    });
  });

  it('never reports a negative length when the clock was set back', () => {
    expect(needsEventsForBreakChange(onBreak, working, 0)).toContainEqual({
      type: 'breakCompleted',
      durationMs: 0,
    });
  });
});
