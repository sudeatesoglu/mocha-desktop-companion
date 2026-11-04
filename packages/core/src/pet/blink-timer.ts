export interface BlinkTimerOptions {
  minMs: number;
  maxMs: number;
  /** Returns a number in [0, 1). Injected so tests can be deterministic. */
  random: () => number;
}

export interface BlinkTimer {
  /** Advances by `stepMs`. Returns true when it is time to blink. */
  update(stepMs: number): boolean;
  /** Starts a fresh random wait. */
  reset(): void;
}

/**
 * Decides when to blink: after a random wait between minMs and maxMs, then
 * again after a new random wait. Irregular blinking looks alive; a fixed
 * rhythm looks mechanical.
 */
export function createBlinkTimer({ minMs, maxMs, random }: BlinkTimerOptions): BlinkTimer {
  if (!(minMs >= 0 && Number.isFinite(maxMs) && maxMs >= minMs)) {
    throw new RangeError(`blink range must satisfy 0 <= min <= max, got ${minMs}..${maxMs}`);
  }

  const nextWait = () => minMs + random() * (maxMs - minMs);
  let waitMs = nextWait();
  let elapsedMs = 0;

  return {
    update(stepMs) {
      elapsedMs += stepMs;
      if (elapsedMs < waitMs) return false;
      elapsedMs = 0;
      waitMs = nextWait();
      return true;
    },
    reset() {
      elapsedMs = 0;
      waitMs = nextWait();
    },
  };
}
