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

export type ReminderSide = 'left' | 'right';

/** Main → reminder: what the bubble says and which side of Mocha it sits on. */
export interface ReminderShow extends ReminderInfo {
  /** The bubble's side of Mocha; its tail points the other way, at Mocha. */
  side: ReminderSide;
}
