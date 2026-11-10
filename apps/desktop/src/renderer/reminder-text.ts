import { formatDuration } from '@mocha/core';
import type { ReminderInfo } from '../shared/reminder.ts';

/** The words in the reminder bubble: gentle, specific, never nagging. */
export function reminderText({ workedMs, breakMs, snoozeMs }: ReminderInfo) {
  return {
    message: `You've been at it for ${formatDuration(workedMs)}. Take ${formatDuration(breakMs)} with me?`,
    accept: 'Take a break',
    snooze: `In ${formatDuration(snoozeMs)}`,
    dismiss: 'Not now',
  };
}
