import { describe, expect, it } from 'vitest';
import { createFlicker } from './flicker.ts';

describe('createFlicker', () => {
  it('stands still while the candle is out', () => {
    const flicker = createFlicker(250);

    expect(flicker.update(10_000, false)).toBe(false);
    expect(flicker.frame).toBe(0);
  });

  it('moves on unevenly while lit, reporting only visible changes', () => {
    const flicker = createFlicker(250);
    const frames: number[] = [];
    const changes: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      changes.push(flicker.update(250, true));
      frames.push(flicker.frame);
    }

    expect(frames).toEqual([0, 1, 0, 1, 1, 0, 1, 0]);
    expect(changes).toEqual([false, true, true, true, false, true, true, true]);
  });

  it('waits for a whole frame before moving on', () => {
    const flicker = createFlicker(250);
    flicker.update(250, true); // to the second 0

    expect(flicker.update(200, true)).toBe(false);
    expect(flicker.update(50, true)).toBe(true);
    expect(flicker.frame).toBe(1);
  });
});
