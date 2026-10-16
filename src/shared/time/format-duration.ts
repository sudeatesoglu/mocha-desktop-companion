const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

/**
 * Formats a duration as a compact, human-friendly string for the
 * companion's speech bubbles and stats, e.g. `"1h 25m"`.
 *
 * - Rounds down to whole minutes; anything below one minute is `"<1m"`.
 * - Hours are never rolled up into days: daily screen time reads more
 *   naturally as `"25h 5m"` than `"1d 1h 5m"`.
 *
 * @param ms Duration in milliseconds. Must be a finite, non-negative number.
 * @throws {RangeError} If `ms` is negative, `NaN` or infinite.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError(`Duration must be a finite, non-negative number, got ${ms}`);
  }

  if (ms === 0) return '0m';

  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  if (totalMinutes === 0) return '<1m';

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
