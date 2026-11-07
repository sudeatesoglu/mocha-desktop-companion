import { DEFAULT_BREAK_CONFIG } from '@mocha/core';
import { describe, expect, it, vi } from 'vitest';
import { createBreakController } from './break-controller.ts';

const MINUTE = 60_000;

describe('createBreakController', () => {
  it('starts in a work stretch at the given time', () => {
    expect(createBreakController(DEFAULT_BREAK_CONFIG, 1_000).state).toEqual({
      phase: 'working',
      workStartedAt: 1_000,
      snoozedUntil: 0,
    });
  });

  it('notifies listeners with the new and previous state when the state changes', () => {
    const breaks = createBreakController(DEFAULT_BREAK_CONFIG, 0);
    const listener = vi.fn();
    breaks.onChange(listener);
    const before = breaks.state;

    breaks.dispatch({ type: 'tick', now: 50 * MINUTE, idleMs: 0 });

    expect(listener).toHaveBeenCalledWith(breaks.state, before);
    expect(breaks.state.phase).toBe('due');
  });

  it('stays quiet when nothing changes', () => {
    const breaks = createBreakController(DEFAULT_BREAK_CONFIG, 0);
    const listener = vi.fn();
    breaks.onChange(listener);

    breaks.dispatch({ type: 'tick', now: MINUTE, idleMs: 0 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const breaks = createBreakController(DEFAULT_BREAK_CONFIG, 0);
    const listener = vi.fn();
    const unsubscribe = breaks.onChange(listener);

    unsubscribe();
    breaks.dispatch({ type: 'pause', now: 0 });

    expect(listener).not.toHaveBeenCalled();
  });
});
