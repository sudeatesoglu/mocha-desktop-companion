import type { RitualPose } from '@mocha/core';
import type { RitualTracker } from './ritual-tracker.ts';

export interface RitualPoseClock {
  now(): number;
  /** Calls `callback` once after `ms`; the returned function cancels it. */
  after(ms: number, callback: () => void): () => void;
}

/**
 * Keeps Mocha in step with the ritual in the bubble: `update` reports the
 * pose for now and looks again when the step ends, so each step's pose
 * starts with it. Call it whenever the ritual starts, finishes or stops.
 */
export function followRitualPoses(
  tracker: Pick<RitualTracker, 'poseAt'>,
  clock: RitualPoseClock,
  report: (pose: RitualPose | null) => void,
) {
  let cancel: (() => void) | undefined;

  function update(): void {
    cancel?.();
    cancel = undefined;
    const at = tracker.poseAt(clock.now());
    report(at?.pose ?? null);
    if (at) cancel = clock.after(at.leftMs, update);
  }

  return { update };
}
