import { describe, expect, it } from 'vitest';
import { timeOfDay } from './time-of-day.ts';

const at = (hour: number, minute = 0) => hour * 60 + minute;

describe('timeOfDay', () => {
  it.each([
    [at(0), 'night'],
    [at(5, 59), 'night'],
    [at(6), 'dawn'],
    [at(7, 59), 'dawn'],
    [at(8), 'day'],
    [at(16, 59), 'day'],
    [at(17), 'dusk'],
    [at(19, 59), 'dusk'],
    [at(20), 'night'],
    [at(23, 59), 'night'],
  ])('calls minute %i %s', (minute, expected) => {
    expect(timeOfDay(minute)).toBe(expected);
  });
});
