import { describe, expect, it, vi } from 'vitest';
import { createReportLimiter, createTokenBucket } from './rate-limit.ts';

/** A clock the test moves by hand. */
const clock = () => {
  let time = 0;
  return { now: () => time, advance: (ms: number) => (time += ms) };
};

describe('createTokenBucket', () => {
  it('lets a burst up to the capacity through, then refuses', () => {
    const time = clock();
    const bucket = createTokenBucket({ capacity: 3, refillPerSecond: 1, now: time.now });

    expect([bucket.tryTake(), bucket.tryTake(), bucket.tryTake(), bucket.tryTake()]).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('refills at the given rate', () => {
    const time = clock();
    const bucket = createTokenBucket({ capacity: 1, refillPerSecond: 2, now: time.now });
    bucket.tryTake();

    time.advance(499);
    expect(bucket.tryTake()).toBe(false);
    time.advance(1);
    expect(bucket.tryTake()).toBe(true); // 2 per second: one every 500 ms
  });

  it('never holds more than its capacity, however long it rests', () => {
    const time = clock();
    const bucket = createTokenBucket({ capacity: 2, refillPerSecond: 1, now: time.now });

    time.advance(60_000);

    expect([bucket.tryTake(), bucket.tryTake(), bucket.tryTake()]).toEqual([true, true, false]);
  });

  it.each([
    ['an empty bucket', { capacity: 0, refillPerSecond: 1 }],
    ['no refill', { capacity: 5, refillPerSecond: 0 }],
  ])('rejects %s', (_case, options) => {
    expect(() => createTokenBucket({ ...options, now: () => 0 })).toThrow(RangeError);
  });
});

describe('createReportLimiter', () => {
  const setup = () => {
    const time = clock();
    const logDropped = vi.fn();
    const limiter = createReportLimiter(
      { capacity: 2, refillPerSecond: 1, now: time.now },
      logDropped,
    );
    return { time, logDropped, limiter };
  };

  it('logs reports while within the rate', () => {
    const { limiter, logDropped } = setup();
    const log = vi.fn();

    limiter.submit(log);
    limiter.submit(log);

    expect(log).toHaveBeenCalledTimes(2);
    expect(logDropped).not.toHaveBeenCalled();
  });

  it('drops a flood and writes one summary line when reports flow again', () => {
    const { time, limiter, logDropped } = setup();
    const log = vi.fn();
    for (let i = 0; i < 50; i++) limiter.submit(log); // an error loop

    expect(log).toHaveBeenCalledTimes(2);
    expect(logDropped).not.toHaveBeenCalled();

    time.advance(1_000);
    limiter.submit(log);

    expect(logDropped).toHaveBeenCalledExactlyOnceWith(48);
    expect(log).toHaveBeenCalledTimes(3);
  });

  it('resets the dropped count after the summary', () => {
    const { time, limiter, logDropped } = setup();
    const log = vi.fn();
    for (let i = 0; i < 3; i++) limiter.submit(log);
    time.advance(1_000);
    limiter.submit(log);

    time.advance(1_000);
    limiter.submit(log);

    expect(logDropped).toHaveBeenCalledOnce();
  });
});
