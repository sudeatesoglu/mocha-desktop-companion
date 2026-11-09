import { DEFAULT_BREAK_CONFIG } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  preferencesSchema,
  toBreakConfig,
} from './preferences.ts';

const MINUTE = 60_000;
const withPatch = (patch: Partial<Preferences>) => ({ ...DEFAULT_PREFERENCES, ...patch });
const messages = (value: unknown) => {
  const result = preferencesSchema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map(({ path, message }) => [path.join('.'), message]);
};

describe('preferencesSchema', () => {
  it('accepts the defaults: 40 minutes of work, 10 of break, 10 of snooze', () => {
    expect(preferencesSchema.parse(DEFAULT_PREFERENCES)).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES).toMatchObject({
      workMinutes: 40,
      breakMinutes: 10,
      snoozeMinutes: 10,
    });
  });

  it.each([
    [
      'too short a work stretch',
      { workMinutes: 14 },
      'workMinutes',
      'Enter whole minutes from 15 to 120.',
    ],
    ['too long a break', { breakMinutes: 31 }, 'breakMinutes', 'Enter whole minutes from 1 to 30.'],
    [
      'a fractional snooze',
      { snoozeMinutes: 7.5 },
      'snoozeMinutes',
      'Enter whole minutes from 5 to 60.',
    ],
    [
      'an empty field',
      { workMinutes: Number.NaN },
      'workMinutes',
      'Enter whole minutes from 15 to 120.',
    ],
  ])('rejects %s with a clear message', (_case, patch, field, message) => {
    expect(messages(withPatch(patch))).toEqual([[field, message]]);
  });

  it('rejects quiet hours that start and end at the same time, but only when on', () => {
    const same = { start: 9 * 60, end: 9 * 60 };

    expect(messages(withPatch({ quietHours: { enabled: true, ...same } }))).toEqual([
      ['quietHours.end', 'Quiet hours need different start and end times.'],
    ]);
    expect(messages(withPatch({ quietHours: { enabled: false, ...same } }))).toEqual([]);
  });

  it('rejects a missing or impossible time', () => {
    expect(
      messages(withPatch({ quietHours: { enabled: true, start: Number.NaN, end: 24 * 60 } })),
    ).toEqual([
      ['quietHours.start', 'Enter a time.'],
      ['quietHours.end', 'Enter a time.'],
    ]);
  });

  it('drops unknown keys', () => {
    expect(preferencesSchema.parse({ ...DEFAULT_PREFERENCES, extra: true })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });
});

describe('toBreakConfig', () => {
  it('turns minutes into the break rules milliseconds and keeps the idle threshold', () => {
    expect(
      toBreakConfig(withPatch({ workMinutes: 25, breakMinutes: 5, snoozeMinutes: 15 })),
    ).toEqual({
      workMs: 25 * MINUTE,
      breakMs: 5 * MINUTE,
      snoozeMs: 15 * MINUTE,
      idleBreakMs: DEFAULT_BREAK_CONFIG.idleBreakMs,
    });
  });
});
