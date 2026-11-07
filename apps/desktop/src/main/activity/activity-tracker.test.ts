import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVITY_POLL_MS,
  type ActivitySample,
  createActivityTracker,
} from './activity-tracker.ts';

const MINUTE = 60_000;

describe('createActivityTracker', () => {
  let now: number;
  let systemIdleMs: number;
  let tick: (() => void) | undefined;
  const stopPolling = vi.fn();
  const samples: ActivitySample[] = [];

  const tracker = () =>
    createActivityTracker(
      {
        now: () => now,
        systemIdleMs: () => systemIdleMs,
        every: (_ms, callback) => {
          tick = callback;
          return stopPolling;
        },
        awayAfterMs: 5 * MINUTE,
      },
      (sample) => samples.push(sample),
    );
  const last = () => samples.at(-1);

  beforeEach(() => {
    now = 0;
    systemIdleMs = 0;
    tick = undefined;
    samples.length = 0;
    stopPolling.mockClear();
  });

  it('polls once a second while running', () => {
    const every = vi.fn(() => () => {});
    createActivityTracker(
      { now: () => 0, systemIdleMs: () => 0, every, awayAfterMs: MINUTE },
      () => {},
    ).start();

    expect(every).toHaveBeenCalledWith(ACTIVITY_POLL_MS, expect.any(Function));
  });

  it('reports the system idle time and whether the user is away', () => {
    tracker().start();

    systemIdleMs = 4 * MINUTE;
    tick?.();
    expect(last()).toEqual({ now: 0, idleMs: 4 * MINUTE, away: false });

    systemIdleMs = 5 * MINUTE;
    tick?.();
    expect(last()?.away).toBe(true);
  });

  it('counts the whole sleep as idle even if the system idle time restarts on wake', () => {
    const activity = tracker();
    activity.start();
    now = 10 * MINUTE;
    activity.markAway(); // going to sleep

    now = 40 * MINUTE; // waking up, idle time reset by the system
    systemIdleMs = 0;
    tick?.();

    expect(last()).toEqual({ now: 40 * MINUTE, idleMs: 30 * MINUTE, away: true });
  });

  it('goes back to the system idle time once the user is back', () => {
    const activity = tracker();
    activity.start();
    activity.markAway();
    now = 30 * MINUTE;
    systemIdleMs = 0;
    tick?.(); // reports the absence once

    now += 1_000;
    systemIdleMs = 1_000;
    tick?.();

    expect(last()).toEqual({ now: 30 * MINUTE + 1_000, idleMs: 1_000, away: false });
  });

  it('keeps counting a locked screen while the user has not touched anything', () => {
    const activity = tracker();
    activity.start();
    activity.markAway(); // screen locked
    now = 8 * MINUTE;
    systemIdleMs = 8 * MINUTE;

    tick?.();
    tick?.();

    expect(last()).toMatchObject({ idleMs: 8 * MINUTE, away: true });
  });

  it('keeps the first moment of absence when sleep follows a lock', () => {
    const activity = tracker();
    activity.start();
    now = 5 * MINUTE;
    activity.markAway(); // lock
    now = 6 * MINUTE;
    activity.markAway(); // then sleep
    now = 20 * MINUTE;

    tick?.();

    expect(last()?.idleMs).toBe(15 * MINUTE);
  });

  it('stops polling and can start again', () => {
    const activity = tracker();
    activity.start();
    activity.start(); // ignored
    expect(activity.running).toBe(true);

    activity.stop();

    expect(stopPolling).toHaveBeenCalledOnce();
    expect(activity.running).toBe(false);
  });
});
