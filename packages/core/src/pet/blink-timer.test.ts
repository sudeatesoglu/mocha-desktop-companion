import { describe, expect, it } from 'vitest';
import { createBlinkTimer } from './blink-timer.ts';

/** A "random" source that returns the given values in order, then repeats the last. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0;
};

describe('createBlinkTimer', () => {
  it('waits a random time between min and max before the first blink', () => {
    const timer = createBlinkTimer({ minMs: 2000, maxMs: 6000, random: sequence(0.5) });

    expect(timer.update(3999)).toBe(false);
    expect(timer.update(1)).toBe(true); // 2000 + 0.5 * 4000
  });

  it('picks a new random wait after each blink', () => {
    const timer = createBlinkTimer({ minMs: 1000, maxMs: 2000, random: sequence(0, 1) });

    expect(timer.update(1000)).toBe(true); // first wait: min
    expect(timer.update(1999)).toBe(false);
    expect(timer.update(1)).toBe(true); // second wait: max
  });

  it('stays within the range for any random value', () => {
    for (const r of [0, 0.25, 0.999999]) {
      const timer = createBlinkTimer({ minMs: 100, maxMs: 200, random: () => r });
      expect(timer.update(99)).toBe(false);
      expect(timer.update(101)).toBe(true);
    }
  });

  it('can be reset, for example while another animation plays', () => {
    const timer = createBlinkTimer({ minMs: 1000, maxMs: 1000, random: () => 0 });
    timer.update(900);

    timer.reset();

    expect(timer.update(900)).toBe(false);
    expect(timer.update(100)).toBe(true);
  });

  it.each([
    ['a negative minimum', { minMs: -1, maxMs: 10 }],
    ['a maximum below the minimum', { minMs: 10, maxMs: 5 }],
    ['a non-finite maximum', { minMs: 0, maxMs: Number.POSITIVE_INFINITY }],
  ])('rejects %s', (_case, range) => {
    expect(() => createBlinkTimer({ ...range, random: () => 0 })).toThrow(RangeError);
  });
});
