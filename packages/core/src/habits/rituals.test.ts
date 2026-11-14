import { describe, expect, it } from 'vitest';
import { RITUALS, type Ritual, ritualById, ritualDuration, ritualProgress } from './rituals.ts';

const SECOND = 1_000;

describe('RITUALS', () => {
  it('offers breathing, resting the eyes and stretching, in that order', () => {
    expect(RITUALS.map(({ id, title, pose }) => [id, title, pose])).toEqual([
      ['breathe', 'Breathe', 'breathe'],
      ['eyes', 'Rest eyes', 'lookFar'],
      ['stretch', 'Stretch', 'stretch'],
    ]);
  });

  it('breathes in four rounds of a 16-second box', () => {
    const breathe = ritualById('breathe');

    expect(breathe.steps).toHaveLength(16);
    expect(breathe.steps.slice(0, 4).map(({ text }) => text)).toEqual([
      'Breathe in',
      'Hold',
      'Breathe out',
      'Hold',
    ]);
    expect(breathe.steps.every(({ durationMs }) => durationMs === 4 * SECOND)).toBe(true);
    expect(ritualDuration(breathe)).toBe(64 * SECOND);
  });

  it('rests the eyes for 20 seconds, then blinks', () => {
    expect(ritualDuration(ritualById('eyes'))).toBe(25 * SECOND);
    expect(ritualById('eyes').steps[0]?.durationMs).toBe(20 * SECOND);
  });

  it('stretches for about a minute', () => {
    expect(ritualDuration(ritualById('stretch'))).toBe(58 * SECOND);
  });

  it('refuses an unknown ritual', () => {
    expect(() => ritualById('nap' as 'eyes')).toThrow('unknown ritual "nap"');
  });
});

describe('ritualProgress', () => {
  const ritual: Ritual = {
    id: 'eyes',
    title: 'Test',
    pose: 'lookFar',
    steps: [
      { text: 'First', durationMs: 10 * SECOND },
      { text: 'Second', durationMs: 5 * SECOND },
    ],
  };

  it('starts on the first step with all its time left', () => {
    expect(ritualProgress(ritual, 0)).toEqual({
      finished: false,
      step: ritual.steps[0],
      stepIndex: 0,
      stepLeftMs: 10 * SECOND,
      totalLeftMs: 15 * SECOND,
    });
  });

  it('counts down within a step and moves on at its end', () => {
    expect(ritualProgress(ritual, 9_999)).toMatchObject({ stepIndex: 0, stepLeftMs: 1 });
    expect(ritualProgress(ritual, 10 * SECOND)).toMatchObject({
      stepIndex: 1,
      stepLeftMs: 5 * SECOND,
      totalLeftMs: 5 * SECOND,
    });
  });

  it('finishes when the last step ends', () => {
    expect(ritualProgress(ritual, 15 * SECOND)).toEqual({ finished: true });
    expect(ritualProgress(ritual, 60 * SECOND)).toEqual({ finished: true });
  });

  it('treats a time before the start as the start', () => {
    expect(ritualProgress(ritual, -5 * SECOND)).toMatchObject({ stepIndex: 0, stepLeftMs: 10_000 });
  });
});
