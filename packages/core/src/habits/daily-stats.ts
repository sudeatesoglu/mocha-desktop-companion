import type { SessionKind } from './session-boundary.ts';

/** A stored work or break session; `endedAt` is null while it is going on. */
export interface SessionRecord {
  readonly kind: SessionKind;
  readonly startedAt: number;
  readonly endedAt: number | null;
}

export interface DailyStats {
  /** Time spent working within the day. */
  readonly activeMs: number;
  /** Breaks that began within the day. */
  readonly breaks: number;
  /** The longest work session within the day, without a break. */
  readonly longestStretchMs: number;
}

/**
 * Sums up one day from its sessions. Work is cut at the day's edges, so a
 * stretch that crosses midnight counts towards both days; a session still
 * going on counts up to `now`. A break counts on the day it began.
 */
export function dailyStats(
  sessions: readonly SessionRecord[],
  day: { start: number; end: number },
  now: number,
): DailyStats {
  const until = Math.min(day.end, now);
  let activeMs = 0;
  let breaks = 0;
  let longestStretchMs = 0;

  for (const { kind, startedAt, endedAt } of sessions) {
    if (kind === 'break') {
      if (startedAt >= day.start && startedAt < day.end) breaks += 1;
      continue;
    }
    const length = Math.max(0, Math.min(endedAt ?? now, until) - Math.max(startedAt, day.start));
    activeMs += length;
    longestStretchMs = Math.max(longestStretchMs, length);
  }
  return { activeMs, breaks, longestStretchMs };
}
