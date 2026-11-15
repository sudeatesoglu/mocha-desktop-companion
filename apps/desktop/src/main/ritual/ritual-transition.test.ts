import { type BreakState, startWorking } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { ritualTransition } from './ritual-transition.ts';

const working = startWorking(0);
const planned: BreakState = { phase: 'onBreak', startedAt: 40, endsAt: 50, workStartedAt: 0 };
const away: BreakState = { phase: 'onBreak', startedAt: 40, endsAt: 40, workStartedAt: 0 };

describe('ritualTransition', () => {
  it('opens for a planned break', () => {
    expect(ritualTransition(planned, working)).toBe('open');
  });

  it('stays closed for a break the user walked into', () => {
    expect(ritualTransition(away, working)).toBeUndefined();
  });

  it('closes when the break ends, however it ends', () => {
    expect(ritualTransition(working, planned)).toBe('close');
    expect(ritualTransition({ phase: 'paused' }, planned)).toBe('close');
  });

  it('does nothing while the break goes on or outside breaks', () => {
    expect(ritualTransition(planned, planned)).toBeUndefined();
    expect(ritualTransition(working, working)).toBeUndefined();
  });
});
