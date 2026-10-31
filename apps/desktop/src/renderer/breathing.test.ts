import { describe, expect, it } from 'vitest';
import { BREATH_HALF_PERIOD_MS, breathOffset } from './breathing.ts';

describe('breathOffset', () => {
  it('starts on the inhale pose', () => {
    expect(breathOffset(0)).toBe(0);
  });

  it('switches pose every half period', () => {
    expect(breathOffset(BREATH_HALF_PERIOD_MS - 1)).toBe(0);
    expect(breathOffset(BREATH_HALF_PERIOD_MS)).toBe(1);
    expect(breathOffset(2 * BREATH_HALF_PERIOD_MS - 1)).toBe(1);
    expect(breathOffset(2 * BREATH_HALF_PERIOD_MS)).toBe(0);
  });

  it('accepts a custom rhythm', () => {
    expect(breathOffset(150, 100)).toBe(1);
  });
});
