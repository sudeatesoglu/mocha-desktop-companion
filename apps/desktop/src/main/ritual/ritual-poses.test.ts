import { ritualById, ritualDuration } from '@mocha/core';
import { describe, expect, it, vi } from 'vitest';
import { followRitualPoses } from './ritual-poses.ts';
import { createRitualTracker } from './ritual-tracker.ts';

/** A clock the test moves by hand; `after` runs when time reaches it. */
function manualClock() {
  let now = 0;
  let timers: { at: number; callback: () => void }[] = [];
  return {
    now: () => now,
    after(ms: number, callback: () => void) {
      const timer = { at: now + ms, callback };
      timers.push(timer);
      return () => {
        timers = timers.filter((other) => other !== timer);
      };
    },
    advance(ms: number) {
      const until = now + ms;
      for (;;) {
        const next = timers.filter(({ at }) => at <= until).sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        timers = timers.filter((timer) => timer !== next);
        now = next.at;
        next.callback();
      }
      now = until;
    },
    get pending() {
      return timers.length;
    },
  };
}

function setup() {
  const tracker = createRitualTracker();
  const clock = manualClock();
  const report = vi.fn();
  const poses = followRitualPoses(tracker, clock, report);
  return { tracker, clock, report, poses };
}

describe('followRitualPoses', () => {
  it('reports each step’s pose as the step starts', () => {
    const { tracker, clock, report, poses } = setup();

    tracker.start('stretch', clock.now());
    poses.update();
    clock.advance(ritualDuration(ritualById('stretch')));

    expect(report.mock.calls.map(([pose]) => pose)).toEqual([
      'shoulderRoll',
      'reachUp',
      'leanLeft',
      'leanRight',
      'tiltLeft',
      'tiltRight',
      'flutter',
      null,
    ]);
    expect(clock.pending).toBe(0);
  });

  it('moves on in time: a step’s pose holds until the step ends', () => {
    const { tracker, clock, report, poses } = setup();

    tracker.start('eyes', clock.now());
    poses.update();
    clock.advance(19_999);
    expect(report).toHaveBeenLastCalledWith('lookFar');

    clock.advance(1);
    expect(report).toHaveBeenLastCalledWith('slowBlink');
  });

  it('stops looking once the ritual stops', () => {
    const { tracker, clock, report, poses } = setup();
    tracker.start('stretch', clock.now());
    poses.update();

    tracker.stop();
    poses.update();
    clock.advance(60_000);

    expect(report).toHaveBeenLastCalledWith(null);
    expect(report).toHaveBeenCalledTimes(2);
    expect(clock.pending).toBe(0);
  });

  it('reports nothing running without a ritual', () => {
    const { clock, report, poses } = setup();

    poses.update();

    expect(report).toHaveBeenCalledWith(null);
    expect(clock.pending).toBe(0);
  });
});
