import { describe, expect, it } from 'vitest';
import { reminderText } from './reminder-text.ts';

const MINUTE = 60_000;

describe('reminderText', () => {
  it('names how long the user worked and the break and snooze lengths', () => {
    expect(
      reminderText({ workedMs: 52 * MINUTE, breakMs: 5 * MINUTE, snoozeMs: 10 * MINUTE }),
    ).toEqual({
      message: "You've been at it for 52m. Take 5m with me?",
      accept: 'Take a break',
      snooze: 'In 10m',
      dismiss: 'Not now',
    });
  });

  it('uses hours for long stretches', () => {
    const { message } = reminderText({
      workedMs: 95 * MINUTE,
      breakMs: 5 * MINUTE,
      snoozeMs: 10 * MINUTE,
    });

    expect(message).toContain('1h 35m');
  });
});
