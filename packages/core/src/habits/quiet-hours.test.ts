import { describe, expect, it } from 'vitest';
import { isQuietTime, minuteOfDay, type QuietHours } from './quiet-hours.ts';

const time = (hours: number, minutes = 0) => hours * 60 + minutes;
const quiet = (start: number, end: number, enabled = true): QuietHours => ({ enabled, start, end });

describe('isQuietTime', () => {
  it('covers a window within one day, start included and end excluded', () => {
    const lunch = quiet(time(12), time(13));

    expect(isQuietTime(lunch, time(11, 59))).toBe(false);
    expect(isQuietTime(lunch, time(12))).toBe(true);
    expect(isQuietTime(lunch, time(12, 59))).toBe(true);
    expect(isQuietTime(lunch, time(13))).toBe(false);
  });

  it('covers a window that crosses midnight', () => {
    const night = quiet(time(22), time(8));

    expect(isQuietTime(night, time(21, 59))).toBe(false);
    expect(isQuietTime(night, time(22))).toBe(true);
    expect(isQuietTime(night, time(0))).toBe(true);
    expect(isQuietTime(night, time(7, 59))).toBe(true);
    expect(isQuietTime(night, time(8))).toBe(false);
  });

  it('is never quiet when turned off or when the window is empty', () => {
    expect(isQuietTime(quiet(time(22), time(8), false), time(23))).toBe(false);
    expect(isQuietTime(quiet(time(9), time(9)), time(9))).toBe(false);
  });
});

describe('minuteOfDay', () => {
  it('counts minutes after local midnight', () => {
    expect(minuteOfDay(new Date(2026, 10, 10, 22, 30, 59).getTime())).toBe(time(22, 30));
    expect(minuteOfDay(new Date(2026, 10, 10, 0, 0).getTime())).toBe(0);
  });
});
