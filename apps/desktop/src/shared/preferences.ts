import { type BreakConfig, DEFAULT_BREAK_CONFIG, MINUTES_PER_DAY } from '@mocha/core';
import { z } from 'zod';

const MINUTE_MS = 60_000;

/** Allowed ranges, in minutes. Shared by the form and the main process. */
export const PREFERENCE_LIMITS = {
  workMinutes: { min: 15, max: 120 },
  breakMinutes: { min: 1, max: 30 },
  snoozeMinutes: { min: 5, max: 60 },
} as const;

const minutes = ({ min, max }: { min: number; max: number }) => {
  const error = `Enter whole minutes from ${min} to ${max}.`;
  return z.int({ error }).min(min, { error }).max(max, { error });
};

const timeOfDay = z
  .int({ error: 'Enter a time.' })
  .min(0, { error: 'Enter a time.' })
  .max(MINUTES_PER_DAY - 1, { error: 'Enter a time.' });

/**
 * What the user can change in the settings window. The same schema checks
 * the form (for messages) and the IPC payload (as the security gate).
 */
export const preferencesSchema = z.object({
  workMinutes: minutes(PREFERENCE_LIMITS.workMinutes),
  breakMinutes: minutes(PREFERENCE_LIMITS.breakMinutes),
  snoozeMinutes: minutes(PREFERENCE_LIMITS.snoozeMinutes),
  quietHours: z
    .object({ enabled: z.boolean(), start: timeOfDay, end: timeOfDay })
    .refine((quiet) => !quiet.enabled || quiet.start !== quiet.end, {
      error: 'Quiet hours need different start and end times.',
      path: ['end'],
    }),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  workMinutes: DEFAULT_BREAK_CONFIG.workMs / MINUTE_MS,
  breakMinutes: DEFAULT_BREAK_CONFIG.breakMs / MINUTE_MS,
  snoozeMinutes: DEFAULT_BREAK_CONFIG.snoozeMs / MINUTE_MS,
  quietHours: { enabled: false, start: 22 * 60, end: 8 * 60 },
};

/** The break rules' configuration for these preferences. */
export function toBreakConfig(preferences: Preferences): BreakConfig {
  return {
    ...DEFAULT_BREAK_CONFIG,
    workMs: preferences.workMinutes * MINUTE_MS,
    breakMs: preferences.breakMinutes * MINUTE_MS,
    snoozeMs: preferences.snoozeMinutes * MINUTE_MS,
  };
}
