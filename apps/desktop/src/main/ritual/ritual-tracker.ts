import {
  type Ritual,
  type RitualId,
  type RitualPose,
  ritualById,
  ritualDuration,
} from '@mocha/core';

/** Slack for timers and messages: a ritual may report its end this much early. */
const FINISH_SLACK_MS = 1_000;

/**
 * Follows the ritual running in the bubble. The page reports when it
 * finished, but main decides whether that earns Mocha's mood: only once
 * per break, and only if the ritual really took its time, so a page cannot
 * farm mood by reporting finishes.
 */
export function createRitualTracker() {
  let running: { ritual: Ritual; startedAt: number } | undefined;
  let rewarded = false;

  return {
    /** The pose of the running ritual, or null. */
    get pose(): RitualPose | null {
      return running?.ritual.pose ?? null;
    },
    start(id: RitualId, now: number): void {
      running = { ritual: ritualById(id), startedAt: now };
    },
    /** The ritual ended; returns true if it earns Mocha's mood. */
    finish(now: number): boolean {
      if (!running) return false;
      const tookItsTime =
        now - running.startedAt >= ritualDuration(running.ritual) - FINISH_SLACK_MS;
      running = undefined;
      if (!tookItsTime || rewarded) return false;
      rewarded = true;
      return true;
    },
    /** The bubble closed: no ritual runs any more. */
    stop(): void {
      running = undefined;
    },
    /** A new break: a new chance for a ritual to count. */
    newBreak(): void {
      running = undefined;
      rewarded = false;
    },
  };
}

export type RitualTracker = ReturnType<typeof createRitualTracker>;
