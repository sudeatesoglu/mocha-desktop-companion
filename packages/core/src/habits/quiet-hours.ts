export const MINUTES_PER_DAY = 24 * 60;

/** A daily window without reminders, in minutes after local midnight. */
export interface QuietHours {
  readonly enabled: boolean;
  /** First quiet minute, 0 to 1439. */
  readonly start: number;
  /** First minute after the quiet time. Before `start` when it crosses midnight. */
  readonly end: number;
}

/** Whether `minute` (after local midnight) falls in the quiet hours. */
export function isQuietTime(quiet: QuietHours, minute: number): boolean {
  if (!quiet.enabled || quiet.start === quiet.end) return false;
  return quiet.start < quiet.end
    ? minute >= quiet.start && minute < quiet.end
    : minute >= quiet.start || minute < quiet.end; // e.g. 22:00 to 08:00
}

/** Minutes after local midnight for a timestamp, in the system time zone. */
export function minuteOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}
