/**
 * Allows at most `limit` requests in any `windowMs`, counted over a
 * sliding window. The clock is injected, so it is tested without waiting.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number) {
  let recent: number[] = [];
  return {
    /** Records a request; returns false if it goes over the limit. */
    allow(): boolean {
      const at = now();
      recent = recent.filter((time) => at - time < windowMs);
      if (recent.length >= limit) return false;
      recent.push(at);
      return true;
    },
  };
}
