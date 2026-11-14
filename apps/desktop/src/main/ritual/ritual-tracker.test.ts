import { ritualById, ritualDuration } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { createRitualTracker } from './ritual-tracker.ts';

const breathe = ritualDuration(ritualById('breathe'));

describe('createRitualTracker', () => {
  it('knows the pose of the running ritual', () => {
    const tracker = createRitualTracker();
    expect(tracker.pose).toBeNull();

    tracker.start('eyes', 0);
    expect(tracker.pose).toBe('lookFar');

    tracker.stop();
    expect(tracker.pose).toBeNull();
  });

  it('rewards a ritual that took its time, once per break', () => {
    const tracker = createRitualTracker();
    tracker.start('breathe', 0);
    expect(tracker.finish(breathe)).toBe(true);
    expect(tracker.pose).toBeNull();

    tracker.start('breathe', breathe);
    expect(tracker.finish(2 * breathe)).toBe(false); // same break

    tracker.newBreak();
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
