import { describe, expect, it } from 'vitest';
import { dailyStats, type SessionRecord } from './daily-stats.ts';

const HOUR = 3_600_000;
const MINUTE = 60_000;
/** A day running from hour 24 to hour 48 of the test clock. */
const day = { start: 24 * HOUR, end: 48 * HOUR };
const at = (hours: number, minutes = 0) => hours * HOUR + minutes * MINUTE;
const work = (startedAt: number, endedAt: number | null): SessionRecord => ({
  kind: 'work',
  startedAt,
  endedAt,
});
const rest = (startedAt: number, endedAt: number | null): SessionRecord => ({
  kind: 'break',
  startedAt,
  endedAt,
});

describe('dailyStats', () => {
  it('is all zero for a day without sessions', () => {
    expect(dailyStats([], day, at(40))).toEqual({ activeMs: 0, breaks: 0, longestStretchMs: 0 });
  });

  it('adds up work, counts breaks and finds the longest stretch', () => {
    const sessions = [
      work(at(33), at(33, 40)),
      rest(at(33, 40), at(33, 50)),
      work(at(33, 50), at(34, 45)),
      rest(at(34, 45), at(35)),
      work(at(35), at(35, 20)),
    ];

    expect(dailyStats(sessions, day, at(40))).toEqual({
      activeMs: at(0, 40 + 55 + 20),
      breaks: 2,
      longestStretchMs: at(0, 55),
    });
  });

  it('splits a stretch that crosses midnight between the two days', () => {
    const sessions = [work(at(23, 30), at(24, 45))];

    expect(dailyStats(sessions, { start: 0, end: day.start }, at(30)).activeMs).toBe(at(0, 30));
    expect(dailyStats(sessions, day, at(30))).toMatchObject({
      activeMs: at(0, 45),
      longestStretchMs: at(0, 45),
    });
  });

  it('counts a session still going on up to now', () => {
    expect(dailyStats([work(at(30), null)], day, at(31, 15)).activeMs).toBe(at(1, 15));
  });

  it('counts a break on the day it began only', () => {
    const lateBreak = [rest(at(23, 50), at(24, 20))];

    expect(dailyStats(lateBreak, day, at(30)).breaks).toBe(0);
    expect(dailyStats(lateBreak, { start: 0, end: day.start }, at(30)).breaks).toBe(1);
  });

  it('ignores time outside the day', () => {
    const sessions = [work(at(10), at(12)), work(at(50), at(51))];

    expect(dailyStats(sessions, day, at(60)).activeMs).toBe(0);
  });
});
