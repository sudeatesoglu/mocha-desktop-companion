import { ritualById, ritualDuration } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { createRitualTracker } from './ritual-tracker.ts';

const breathe = ritualDuration(ritualById('breathe'));

describe('createRitualTracker', () => {
  it('knows the pose of the running step and how long it lasts', () => {
    const tracker = createRitualTracker();
    expect(tracker.poseAt(0)).toBeNull();

    tracker.start('eyes', 1_000);
    expect(tracker.poseAt(1_000)).toEqual({ pose: 'lookFar', leftMs: 20_000 });
    expect(tracker.poseAt(22_000)).toEqual({ pose: 'slowBlink', leftMs: 4_000 });
    expect(tracker.poseAt(26_000)).toBeNull(); // the steps are over

    tracker.stop();
    expect(tracker.poseAt(2_000)).toBeNull();
  });

  it('rewards a ritual that took its time, once per break', () => {
    const tracker = createRitualTracker();
    expect(tracker.rewarded).toBe(false);
    tracker.start('breathe', 0);
    expect(tracker.finish(breathe)).toBe(true);
    expect(tracker.poseAt(0)).toBeNull();
    expect(tracker.rewarded).toBe(true);

    tracker.start('breathe', breathe);
    expect(tracker.finish(2 * breathe)).toBe(false); // same break

    tracker.newBreak();
    expect(tracker.rewarded).toBe(false);
    tracker.start('breathe', 0);
    expect(tracker.finish(breathe - 500)).toBe(true); // within the slack
  });

  it('does not reward a finish that came too early, or without a start', () => {
    const tracker = createRitualTracker();
    expect(tracker.finish(10_000)).toBe(false);

    tracker.start('stretch', 0);
    expect(tracker.finish(5_000)).toBe(false);
  });
});
