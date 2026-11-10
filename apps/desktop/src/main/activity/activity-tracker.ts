export interface ActivitySample {
  now: number;
  /** How long there has been no input, including time asleep or locked. */
  idleMs: number;
  /** The user counts as away (idle for at least `awayAfterMs`). */
  away: boolean;
}

export interface ActivityTrackerDeps {
  now(): number;
  /** Milliseconds since the last keyboard or mouse input, system-wide. */
  systemIdleMs(): number;
  /** Runs `callback` every `ms` milliseconds until the returned function is called. */
  every(ms: number, callback: () => void): () => void;
  awayAfterMs: number;
}

export interface ActivityTracker {
  start(): void;
  stop(): void;
  /** The machine is going to sleep or the screen locked: the user is leaving now. */
  markAway(): void;
  readonly running: boolean;
}

export const ACTIVITY_POLL_MS = 1_000;

/**
 * Reports how long the user has been inactive. It reads only the duration
 * since the last input: never which keys, where the mouse is, or which
 * window is open.
 *
 * Sleep and screen lock are remembered with their start time, because the
 * system idle time can restart from zero on wake, which would hide how long
 * the user was gone. The first sample after returning still reports the
 * whole absence; later samples go back to the system idle time.
 */
export function createActivityTracker(
  deps: ActivityTrackerDeps,
  onSample: (sample: ActivitySample) => void,
): ActivityTracker {
  let stopPolling: (() => void) | undefined;
  let awaySince: number | undefined;

  function sample(): void {
    const now = deps.now();
    const systemIdleMs = deps.systemIdleMs();
    const absentMs = awaySince === undefined ? 0 : Math.max(0, now - awaySince);
    const idleMs = Math.max(systemIdleMs, absentMs);

    onSample({ now, idleMs, away: idleMs >= deps.awayAfterMs });

    // Input after the absence began: the user is back.
    if (awaySince !== undefined && systemIdleMs < absentMs) awaySince = undefined;
  }

  return {
    get running() {
      return stopPolling !== undefined;
    },
    start() {
      if (stopPolling) return;
      stopPolling = deps.every(ACTIVITY_POLL_MS, sample);
    },
    stop() {
      stopPolling?.();
      stopPolling = undefined;
    },
    markAway() {
      awaySince ??= deps.now();
    },
  };
}
