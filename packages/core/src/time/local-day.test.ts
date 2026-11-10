import { describe, expect, it } from 'vitest';
import { localDay } from './local-day.ts';

describe('localDay', () => {
  it('runs from local midnight to the next local midnight', () => {
    expect(localDay(new Date(2026, 10, 10, 15, 42).getTime())).toEqual({
      start: new Date(2026, 10, 10).getTime(),
      end: new Date(2026, 10, 11).getTime(),
    });
  });

  it('puts midnight itself in the day it starts', () => {
    const midnight = new Date(2026, 11, 31).getTime();

    expect(localDay(midnight).start).toBe(midnight);
    expect(localDay(midnight - 1).end).toBe(midnight);
  });

  it('crosses month and year ends', () => {
    expect(localDay(new Date(2026, 11, 31, 23, 59).getTime()).end).toBe(
      new Date(2027, 0, 1).getTime(),
    );
  });
});
