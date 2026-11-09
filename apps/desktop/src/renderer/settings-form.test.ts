import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, preferencesSchema } from '../shared/preferences.ts';
import {
  type FormValues,
  fieldErrors,
  fromFormValues,
  minutesToTime,
  timeToMinutes,
  toFormValues,
} from './settings-form.ts';

const form = (patch: Partial<FormValues>): FormValues => ({
  ...toFormValues(DEFAULT_PREFERENCES),
  ...patch,
});
const errorsFor = (values: FormValues) => {
  const result = preferencesSchema.safeParse(fromFormValues(values));
  return result.success ? {} : fieldErrors(result.error.issues);
};

describe('times', () => {
  it('converts between "HH:MM" and minutes after midnight', () => {
    expect(timeToMinutes('22:30')).toBe(1350);
    expect(timeToMinutes('08:05:00')).toBe(485);
    expect(minutesToTime(1350)).toBe('22:30');
    expect(minutesToTime(5)).toBe('00:05');
  });

  it.each(['', '7:30', 'noon'])('gives NaN for "%s"', (value) => {
    expect(timeToMinutes(value)).toBeNaN();
  });
});

describe('form values', () => {
  it('round-trips the preferences', () => {
    expect(fromFormValues(toFormValues(DEFAULT_PREFERENCES))).toEqual(DEFAULT_PREFERENCES);
  });

  it('shows the defaults as text and times', () => {
    expect(toFormValues(DEFAULT_PREFERENCES)).toEqual({
      workMinutes: '40',
      breakMinutes: '10',
      snoozeMinutes: '10',
      quietEnabled: false,
      quietStart: '22:00',
      quietEnd: '08:00',
    });
  });
});

describe('fieldErrors', () => {
  it('puts each message under its own field', () => {
    expect(errorsFor(form({ workMinutes: '', breakMinutes: '45' }))).toEqual({
      workMinutes: 'Enter whole minutes from 15 to 120.',
      breakMinutes: 'Enter whole minutes from 1 to 30.',
    });
  });

  it('flags the quiet hours end when it equals the start', () => {
    expect(errorsFor(form({ quietEnabled: true, quietStart: '09:00', quietEnd: '09:00' }))).toEqual(
      {
        quietEnd: 'Quiet hours need different start and end times.',
      },
    );
  });

  it('keeps the first message per field and ignores unknown paths', () => {
    expect(
      fieldErrors([
        { path: ['quietHours', 'start'], message: 'first' },
        { path: ['quietHours', 'start'], message: 'second' },
        { path: ['somethingElse'], message: 'ignored' },
      ]),
    ).toEqual({ quietStart: 'first' });
  });
});
