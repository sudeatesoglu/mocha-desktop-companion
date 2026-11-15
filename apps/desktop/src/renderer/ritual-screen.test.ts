import { ritualById } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { ritualScreen } from './ritual-screen.ts';

describe('ritualScreen', () => {
  const breathe = ritualById('breathe');

  it('shows the first step with its countdown at the start', () => {
    expect(ritualScreen(breathe, 0)).toEqual({
      kind: 'step',
      title: 'Breathe',
      text: 'Breathe in',
      seconds: 3,
      progress: 0,
    });
  });

  it('counts whole seconds down within a step and fills up overall', () => {
    expect(ritualScreen(breathe, 4_500)).toMatchObject({ text: 'Hold', seconds: 2 });
    expect(ritualScreen(breathe, 24_000)).toMatchObject({ text: 'Breathe in', progress: 0.5 });
  });

  it('is done when the ritual ends', () => {
    expect(ritualScreen(breathe, 48_000)).toEqual({ kind: 'done' });
  });
});
