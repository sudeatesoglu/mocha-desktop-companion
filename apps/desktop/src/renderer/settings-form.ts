import type { Preferences } from '../shared/preferences.ts';

/** The form's raw values, as the inputs hold them. */
export interface FormValues {
  workMinutes: string;
  breakMinutes: string;
  snoozeMinutes: string;
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

export type FieldName = keyof FormValues;

/** "22:30" (an <input type="time"> value) → minutes after midnight; NaN if empty or malformed. */
export function timeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes after midnight → "22:30". */
export function minutesToTime(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function toFormValues(preferences: Preferences): FormValues {
  return {
    workMinutes: String(preferences.workMinutes),
    breakMinutes: String(preferences.breakMinutes),
    snoozeMinutes: String(preferences.snoozeMinutes),
    quietEnabled: preferences.quietHours.enabled,
    quietStart: minutesToTime(preferences.quietHours.start),
    quietEnd: minutesToTime(preferences.quietHours.end),
  };
}

/** Raw values → a candidate for the schema; an empty field becomes NaN, which it rejects. */
export function fromFormValues(values: FormValues): unknown {
  const number = (value: string) => (value.trim() === '' ? Number.NaN : Number(value));
  return {
    workMinutes: number(values.workMinutes),
    breakMinutes: number(values.breakMinutes),
    snoozeMinutes: number(values.snoozeMinutes),
    quietHours: {
      enabled: values.quietEnabled,
      start: timeToMinutes(values.quietStart),
      end: timeToMinutes(values.quietEnd),
    },
  };
}

const FIELD_BY_PATH: Record<string, FieldName> = {
  workMinutes: 'workMinutes',
  breakMinutes: 'breakMinutes',
  snoozeMinutes: 'snoozeMinutes',
  'quietHours.enabled': 'quietEnabled',
  'quietHours.start': 'quietStart',
  'quietHours.end': 'quietEnd',
};

/** Schema issues → the first message for each form field. */
export function fieldErrors(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  for (const { path, message } of issues) {
    const field = FIELD_BY_PATH[path.map(String).join('.')];
    if (field && !errors[field]) errors[field] = message;
  }
  return errors;
}
