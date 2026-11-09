import { describe, expect, it } from 'vitest';
import type { BreakState } from './break-machine.ts';
import { sessionBoundary, sessionKind } from './session-boundary.ts';

const working: BreakState = { phase: 'working', workStartedAt: 0, snoozedUntil: 0 };
const due: BreakState = { phase: 'due', workStartedAt: 0, dueAt: 50 };
const onBreak: BreakState = { phase: 'onBreak', startedAt: 40, endsAt: 45, workStartedAt: 0 };
const paused: BreakState = { phase: 'paused' };

describe('sessionKind', () => {
  it.each([
    [working, 'work'],
    [due, 'work'],
    [onBreak, 'break'],
    [paused, undefined],
  ])('maps %o to %s', (state, kind) => {
    expect(sessionKind(state)).toBe(kind);
  });
});

describe('sessionBoundary', () => {
  it('keeps one work session while a reminder is due, snoozed or dismissed', () => {
    const dismissed: BreakState = { phase: 'working', workStartedAt: 60, snoozedUntil: 0 };

    expect(sessionBoundary(working, due, 50)).toBeUndefined();
    expect(sessionBoundary(due, working, 60)).toBeUndefined();
    expect(sessionBoundary(due, dismissed, 60)).toBeUndefined();
  });

  it('switches to a break where the break began, even if noticed later', () => {
    expect(sessionBoundary(working, onBreak, 100)).toEqual({ at: 40, kind: 'break' });
  });

  it('switches back to work when the new work stretch starts', () => {
    const back: BreakState = { phase: 'working', workStartedAt: 120, snoozedUntil: 0 };

    expect(sessionBoundary(onBreak, back, 120)).toEqual({ at: 120, kind: 'work' });
  });

  it('ends the session on pause and starts work again on resume', () => {
    const resumed: BreakState = { phase: 'working', workStartedAt: 300, snoozedUntil: 0 };

    expect(sessionBoundary(due, paused, 200)).toEqual({ at: 200, kind: undefined });
    expect(sessionBoundary(paused, resumed, 300)).toEqual({ at: 300, kind: 'work' });
  });
});
