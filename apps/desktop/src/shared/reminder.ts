/** Size of the break reminder window in screen pixels. */
export const REMINDER_WIDTH = 264;
export const REMINDER_HEIGHT = 112;

export type ReminderChoice = 'accept' | 'snooze' | 'dismiss';

export interface ReminderInfo {
  /** How long the user has worked without a break. */
  workedMs: number;
  /** How long the suggested break lasts. */
  breakMs: number;
  /** How long a snooze waits. */
  snoozeMs: number;
}
