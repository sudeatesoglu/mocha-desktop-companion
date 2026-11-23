import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limiter.ts';

describe('createRateLimiter', () => {
  it('allows up to the limit in a window, then refuses', () => {
    let now = 0;
    const limiter = createRateLimiter(3, 1_000, () => now);

    expect([limiter.allow(), limiter.allow(), limiter.allow(), limiter.allow()]).toEqual([
      true,
      true,
      true,
      false,
    ]);
    now = 999;
    expect(limiter.allow()).toBe(false);
  });

  it('allows again as old requests leave the window', () => {
    let now = 0;
    const limiter = createRateLimiter(2, 1_000, () => now);
    limiter.allow();
    now = 500;
    limiter.allow();

    now = 1_000;
    expect(limiter.allow()).toBe(true); // the first one left
    expect(limiter.allow()).toBe(false); // the second is still in
  });
});
