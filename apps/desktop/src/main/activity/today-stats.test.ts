import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { MIGRATIONS, runMigrations } from '../db/migrations.ts';
import { createSessionRepository } from '../db/session-repository.ts';
import { createTodayStats } from './today-stats.ts';

const MINUTE = 60_000;
const today = (hours: number, minutes = 0) => new Date(2026, 10, 10, hours, minutes).getTime();

describe('createTodayStats', () => {
  const logger = { warn: vi.fn() };

  it('sums up the local day of `now` from the stored sessions', () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db, MIGRATIONS);
    const sessions = createSessionRepository(db);
    const yesterday = sessions.start('work', today(-1)); // 23:00 the day before
    sessions.end(yesterday, today(0, 30));
    const pause = sessions.start('break', today(0, 30));
    sessions.end(pause, today(0, 40));
    sessions.start('work', today(9)); // still going on

    expect(createTodayStats(sessions, logger)(today(10))).toEqual({
      activeMs: 90 * MINUTE,
      breaks: 1,
      longestStretchMs: 60 * MINUTE,
    });
  });

  it('gives undefined and a warning if the sessions cannot be read', () => {
    const broken = {
      overlapping: () => {
        throw new Error('database is locked');
      },
    };

    expect(createTodayStats(broken, logger)(today(10))).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      '[db] could not read today’s sessions',
      expect.any(Error),
    );
  });
});
