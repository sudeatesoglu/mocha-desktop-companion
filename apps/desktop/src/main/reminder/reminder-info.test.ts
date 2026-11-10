import { DEFAULT_BREAK_CONFIG } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { reminderInfo } from './reminder-info.ts';

const MINUTE = 60_000;

describe('reminderInfo', () => {
  it('counts the work from the start of the stretch to when the break became due', () => {
    expect(
      reminderInfo(
        { phase: 'due', workStartedAt: 10 * MINUTE, dueAt: 62 * MINUTE },
        DEFAULT_BREAK_CONFIG,
      ),
    ).toEqual({
      workedMs: 52 * MINUTE,
      breakMs: DEFAULT_BREAK_CONFIG.breakMs,
      snoozeMs: DEFAULT_BREAK_CONFIG.snoozeMs,
    });
  });
});
