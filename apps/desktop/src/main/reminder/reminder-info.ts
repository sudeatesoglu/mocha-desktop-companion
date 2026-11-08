import type { BreakConfig, BreakState } from '@mocha/core';
import type { ReminderInfo } from '../../shared/reminder.ts';

export type DueState = Extract<BreakState, { phase: 'due' }>;

/** The durations the bubble names, taken from the break that became due. */
export function reminderInfo(state: DueState, config: BreakConfig): ReminderInfo {
  return {
    workedMs: state.dueAt - state.workStartedAt,
    breakMs: config.breakMs,
    snoozeMs: config.snoozeMs,
  };
}
