import type { BreakState } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { reminderTransition } from './reminder-transition.ts';

const working: BreakState = { phase: 'working', workStartedAt: 0, snoozedUntil: 0 };
const due: BreakState = { phase: 'due', workStartedAt: 0, dueAt: 1 };
const onBreak: BreakState = { phase: 'onBreak', startedAt: 1, endsAt: 2, workStartedAt: 0 };
const paused: BreakState = { phase: 'paused' };

describe('reminderTransition', () => {
  it('opens when a break becomes due', () => {
    expect(reminderTransition(due, working)).toBe('open');
  });

  it.each([
    ['a break starts', onBreak],
    ['it is snoozed or dismissed', working],
    ['Mocha is paused', paused],
  ])('closes when %s', (_case, next) => {
    expect(reminderTransition(next, due)).toBe('close');
  });

  it('does nothing for changes that do not involve a due break', () => {
    expect(reminderTransition(onBreak, working)).toBeUndefined();
    expect(reminderTransition(working, onBreak)).toBeUndefined();
    expect(reminderTransition(paused, working)).toBeUndefined();
  });
});
