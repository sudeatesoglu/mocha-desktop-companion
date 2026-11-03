import { describe, expect, it } from 'vitest';
import { gazeOffset } from './gaze.ts';

const EYE = { x: 20, y: 20 };
const at = (dx: number, dy: number) => ({ x: EYE.x + dx, y: EYE.y + dy });

describe('gazeOffset', () => {
  it.each([
    ['right', at(30, 0), { x: 1, y: 0 }],
    ['left', at(-30, 0), { x: -1, y: 0 }],
    ['down', at(0, 30), { x: 0, y: 1 }],
    ['up', at(0, -30), { x: 0, y: -1 }],
    ['down-right', at(30, 30), { x: 1, y: 1 }],
    ['up-left', at(-30, -30), { x: -1, y: -1 }],
    ['up-right', at(30, -30), { x: 1, y: -1 }],
    ['down-left', at(-30, 30), { x: -1, y: 1 }],
  ])('looks %s toward the cursor', (_direction, cursor, expected) => {
    expect(gazeOffset(EYE, cursor)).toEqual(expected);
  });

  it('snaps to the nearest of eight directions', () => {
    // 20 degrees below horizontal is closer to "right" than to "down-right".
    const angle = (20 * Math.PI) / 180;
    expect(gazeOffset(EYE, at(100 * Math.cos(angle), 100 * Math.sin(angle)))).toEqual({
      x: 1,
      y: 0,
    });
    // 30 degrees is closer to the diagonal.
    const steep = (30 * Math.PI) / 180;
    expect(gazeOffset(EYE, at(100 * Math.cos(steep), 100 * Math.sin(steep)))).toEqual({
      x: 1,
      y: 1,
    });
  });

  it('looks straight ahead when the cursor is very close to the eye', () => {
    expect(gazeOffset(EYE, at(2, 1))).toEqual({ x: 0, y: 0 });
  });

  it('accepts a custom dead zone', () => {
    expect(gazeOffset(EYE, at(10, 0), { deadZone: 12 })).toEqual({ x: 0, y: 0 });
    expect(gazeOffset(EYE, at(10, 0), { deadZone: 8 })).toEqual({ x: 1, y: 0 });
  });

  it('never returns negative zero', () => {
    const { x, y } = gazeOffset(EYE, at(0, -30));

    expect(Object.is(x, -0)).toBe(false);
    expect(Object.is(y, -0)).toBe(false);
  });
});
