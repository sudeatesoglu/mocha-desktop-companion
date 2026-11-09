import { type DailyStats, dailyStats, localDay } from '@mocha/core';
import type { SessionRepository } from '../db/session-repository.ts';

/**
 * Reads today's sessions and sums them up, at the moment it is called, so
 * the tray menu is current whenever it opens. Undefined if the database
 * cannot be read: the menu then leaves the numbers out.
 */
export function createTodayStats(
  sessions: Pick<SessionRepository, 'overlapping'>,
  logger: { warn(message: string, details?: unknown): void },
): (now: number) => DailyStats | undefined {
  return (now) => {
    const day = localDay(now);
    try {
      return dailyStats(sessions.overlapping(day.start, day.end), day, now);
    } catch (error) {
      logger.warn('[db] could not read today’s sessions', error);
      return undefined;
    }
  };
}
