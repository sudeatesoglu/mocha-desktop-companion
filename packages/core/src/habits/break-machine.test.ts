import { describe, expect, it } from 'vitest';
import {
  type BreakConfig,
  type BreakEvent,
  type BreakState,
  breakConfig,
  DEFAULT_BREAK_CONFIG,
  reduceBreak,
  startWorking,
} from './break-machine.ts';

const MINUTE = 60_000;

/** A moment in minutes since the start of the test. */
const at = (minutes: number) => minutes * MINUTE;

// The rules are tested with fixed durations, so changing a default does not
// change what these tests mean.
const config = breakConfig({
  workMs: at(50),
  breakMs: at(5),
  snoozeMs: at(10),
  idleBreakMs: at(5),
});
const tick = (minutes: number, idleMinutes = 0): BreakEvent => ({
  type: 'tick',
  now: at(minutes),
  idleMs: at(idleMinutes),
});

/** Plays events in order from a fresh work stretch. */
function play(events: BreakEvent[], options: BreakConfig = config): BreakState {
  return events.reduce((state, event) => reduceBreak(state, event, options), startWorking(0));
}

describe('defaults', () => {
  it('reminds after 40 minutes, suggests 10-minute breaks and snoozes for 10', () => {
    expect(DEFAULT_BREAK_CONFIG).toEqual({
      workMs: at(40),
      breakMs: at(10),
      snoozeMs: at(10),
      idleBreakMs: at(5),
    });
  });
});

describe('working', () => {
  it('stays working before the interval is over', () => {
    expect(play([tick(49)])).toEqual({ phase: 'working', workStartedAt: 0, snoozedUntil: 0 });
  });

  it('becomes due when the interval is over', () => {
    expect(play([tick(50)])).toEqual({ phase: 'due', workStartedAt: 0, dueAt: at(50) });
  });

  it('keeps counting through short pauses that are not long enough to be a break', () => {
    expect(play([tick(20, 4), tick(50)]).phase).toBe('due');
  });

  it('counts going idle as a break that began when the user left', () => {
    expect(play([tick(30, 5)])).toEqual({
      phase: 'onBreak',
      startedAt: at(25),
      endsAt: at(25),
      workStartedAt: 0,
    });
  });

  it('does not place a break before the work stretch began', () => {
    const state = play([tick(5, 60)]); // idle since long before this stretch

    expect(state).toMatchObject({ phase: 'onBreak', startedAt: 0 });
  });

  it('returns the same state when nothing changes, so callers can skip work', () => {
    const state = startWorking(0);

    expect(reduceBreak(state, tick(1), config)).toBe(state);
  });

  it('survives the clock moving backwards', () => {
    expect(reduceBreak(startWorking(at(100)), tick(1), config).phase).toBe('working');
  });
});

describe('when a break is due', () => {
  const due = [tick(50)];

  it('starts a break on accept, for the configured length', () => {
    expect(play([...due, { type: 'accept', now: at(51) }])).toEqual({
      phase: 'onBreak',
      startedAt: at(51),
      endsAt: at(56),
      workStartedAt: 0,
    });
  });

  it('asks again after a snooze, keeping the same work stretch', () => {
    const snoozed = [...due, { type: 'snooze', now: at(51) } as const];

    expect(play(snoozed)).toEqual({ phase: 'working', workStartedAt: 0, snoozedUntil: at(61) });
    expect(play([...snoozed, tick(60)]).phase).toBe('working');
    expect(play([...snoozed, tick(61)])).toMatchObject({ phase: 'due', dueAt: at(61) });
  });

  it('starts a new work stretch on dismiss', () => {
    const dismissed = [...due, { type: 'dismiss', now: at(51) } as const];

    expect(play(dismissed)).toEqual({ phase: 'working', workStartedAt: at(51), snoozedUntil: 0 });
    expect(play([...dismissed, tick(100)]).phase).toBe('working');
    expect(play([...dismissed, tick(101)]).phase).toBe('due');
  });

  it('turns into a break when the user walks away instead of answering', () => {
    expect(play([...due, tick(60, 5)])).toMatchObject({ phase: 'onBreak', startedAt: at(55) });
  });

  it('stays due while the user keeps working', () => {
    const state = play(due);

    expect(reduceBreak(state, tick(70), config)).toBe(state);
  });
});

describe('on a break', () => {
  const accepted = [tick(50), { type: 'accept', now: at(50) } as const];

  it('lasts until the break length is over', () => {
    expect(play([...accepted, tick(54)]).phase).toBe('onBreak');
    expect(play([...accepted, tick(55)])).toEqual({
      phase: 'working',
      workStartedAt: at(55),
      snoozedUntil: 0,
    });
  });

  it('goes on while the user is still away after the break length', () => {
    const state = play([...accepted, tick(70, 18)]);

    expect(state.phase).toBe('onBreak');
    expect(play([...accepted, tick(70, 18), tick(71)])).toMatchObject({
      phase: 'working',
      workStartedAt: at(71),
    });
  });

  it('ends a break from being away as soon as the user returns', () => {
    const away = tick(30, 5);

    expect(play([away, tick(31, 6)]).phase).toBe('onBreak');
    expect(play([away, tick(40)])).toEqual({
      phase: 'working',
      workStartedAt: at(40),
      snoozedUntil: 0,
    });
  });
});

describe('paused', () => {
  const pause = { type: 'pause', now: at(10) } as const;

  it.each([
    ['working', []],
    ['due', [tick(50)]],
    ['on a break', [tick(50), { type: 'accept', now: at(50) } as const]],
  ])('can be entered while %s', (_name, before) => {
    expect(play([...before, pause])).toEqual({ phase: 'paused' });
  });

  it('ignores time passing', () => {
    const state = play([pause]);

    expect(reduceBreak(state, tick(500, 100), config)).toBe(state);
  });

  it('starts a new work stretch on resume', () => {
    expect(play([pause, { type: 'resume', now: at(90) }])).toEqual({
      phase: 'working',
      workStartedAt: at(90),
      snoozedUntil: 0,
    });
  });
});

describe('events that do not apply', () => {
  it.each(['accept', 'snooze', 'dismiss', 'resume'] as const)(
    'ignores %s while working',
    (type) => {
      const state = startWorking(0);

      expect(reduceBreak(state, { type, now: at(1) }, config)).toBe(state);
    },
  );

  it.each(['accept', 'snooze', 'dismiss', 'resume'] as const)('ignores %s on a break', (type) => {
    const state = play([tick(30, 5)]);

    expect(reduceBreak(state, { type, now: at(31) }, config)).toBe(state);
  });

  it('ignores resume while a break is due', () => {
    const state = play([tick(50)]);

    expect(reduceBreak(state, { type: 'resume', now: at(51) }, config)).toBe(state);
  });

  it('ignores a second pause', () => {
    const state = play([{ type: 'pause', now: 0 }]);

    expect(reduceBreak(state, { type: 'pause', now: at(1) }, config)).toBe(state);
  });
});

describe('configuration', () => {
  it('applies custom durations', () => {
    const quick = breakConfig({ workMs: at(25), breakMs: at(2) });

    expect(play([tick(25)], quick).phase).toBe('due');
    expect(play([tick(25), { type: 'accept', now: at(25) }], quick)).toMatchObject({
      endsAt: at(27),
    });
  });

  it('keeps defaults for what is not set', () => {
    expect(breakConfig({ workMs: at(25) }).snoozeMs).toBe(DEFAULT_BREAK_CONFIG.snoozeMs);
  });

  it.each([
    ['a zero interval', { workMs: 0 }],
    ['a negative break', { breakMs: -1 }],
    ['an infinite snooze', { snoozeMs: Number.POSITIVE_INFINITY }],
    ['a NaN idle time', { idleBreakMs: Number.NaN }],
  ])('rejects %s', (_name, overrides) => {
    expect(() => breakConfig(overrides)).toThrow(RangeError);
  });
});
