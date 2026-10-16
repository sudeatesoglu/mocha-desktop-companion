import { describe, expect, it } from 'vitest';
import { formatDuration } from './format-duration.ts';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe('formatDuration', () => {
  it('formats zero as 0m', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('shows <1m for durations shorter than a minute', () => {
    expect(formatDuration(1)).toBe('<1m');
    expect(formatDuration(59 * SECOND)).toBe('<1m');
  });

  it('formats whole minutes under an hour', () => {
    expect(formatDuration(MINUTE)).toBe('1m');
    expect(formatDuration(59 * MINUTE)).toBe('59m');
  });

  it('rounds down to the nearest minute', () => {
    expect(formatDuration(25 * MINUTE + 59 * SECOND)).toBe('25m');
  });

  it('omits minutes on exact hours', () => {
    expect(formatDuration(HOUR)).toBe('1h');
    expect(formatDuration(3 * HOUR)).toBe('3h');
  });

  it('combines hours and minutes', () => {
    expect(formatDuration(HOUR + 25 * MINUTE)).toBe('1h 25m');
  });

  it('keeps counting hours past a day instead of switching to days', () => {
    expect(formatDuration(25 * HOUR + 5 * MINUTE)).toBe('25h 5m');
  });

  it.each([
    ['negative', -1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('throws a RangeError for %s input', (_label, input) => {
    expect(() => formatDuration(input)).toThrow(RangeError);
  });
});
