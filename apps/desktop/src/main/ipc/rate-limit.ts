export interface TokenBucketOptions {
  /** Most tokens the bucket holds: the size of a burst that is allowed through. */
  capacity: number;
  /** Tokens added back per second. */
  refillPerSecond: number;
  /** Monotonic time in milliseconds. Injected for deterministic tests. */
  now: () => number;
}

/**
 * Token bucket rate limiter. Each event takes a token; tokens refill at a
 * steady rate up to the capacity. Short bursts pass, a sustained flood is
 * throttled to the refill rate.
 */
export function createTokenBucket({ capacity, refillPerSecond, now }: TokenBucketOptions) {
  if (!(capacity >= 1 && refillPerSecond > 0)) {
    throw new RangeError('capacity must be >= 1 and refillPerSecond > 0');
  }
  let tokens = capacity;
  let last = now();

  return {
    tryTake(): boolean {
      const current = now();
      tokens = Math.min(capacity, tokens + ((current - last) / 1000) * refillPerSecond);
      last = current;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    },
  };
}

export interface ReportLimiter {
  /** Runs `log` if the rate allows it; otherwise counts the report as dropped. */
  submit(log: () => void): void;
}

/**
 * Limits how often one source may write to the log. Dropped reports are
 * counted, and a single summary line is written once reports are allowed
 * through again, instead of one line per dropped report.
 */
export function createReportLimiter(
  options: TokenBucketOptions,
  logDropped: (count: number) => void,
): ReportLimiter {
  const bucket = createTokenBucket(options);
  let dropped = 0;

  return {
    submit(log) {
      if (!bucket.tryTake()) {
        dropped += 1;
        return;
      }
      if (dropped > 0) {
        logDropped(dropped);
        dropped = 0;
      }
      log();
    },
  };
}
