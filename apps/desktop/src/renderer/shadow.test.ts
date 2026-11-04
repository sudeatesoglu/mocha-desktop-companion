import { describe, expect, it } from 'vitest';
import { drawShadow, SHADOW_COLOR, SHADOW_WIDTH, shadowRows } from './shadow.ts';

const GROUND = 46;
const STANDING = { x: 24, y: GROUND };

describe('shadowRows', () => {
  it('lies on the ground line, widest in the middle row', () => {
    const rows = shadowRows(STANDING, GROUND);

    expect(rows.map((row) => row.y)).toEqual([GROUND - 1, GROUND, GROUND + 1]);
    expect(rows[1]?.width).toBe(SHADOW_WIDTH);
    expect(Math.max(...rows.map((row) => row.width))).toBe(SHADOW_WIDTH);
  });

  it('is centered between the two center pixels at feet.x and feet.x + 1', () => {
    for (const { x, width } of shadowRows(STANDING, GROUND)) {
      expect(x + width / 2).toBe(STANDING.x + 1);
    }
  });

  it('stays on the ground and shrinks as the feet rise', () => {
    const airborne = shadowRows({ x: 24, y: GROUND - 4 }, GROUND);

    const width = SHADOW_WIDTH - 8; // four pixels up: two narrower per pixel
    expect(airborne[1]).toEqual({ x: 24 + 1 - width / 2, y: GROUND, width });
  });

  it('never shrinks below a few pixels, however high Mocha jumps', () => {
    const rows = shadowRows({ x: 24, y: 0 }, GROUND);

    expect(rows.every((row) => row.width >= 2)).toBe(true);
    expect(rows[1]?.width).toBe(4);
  });

  it('treats feet below the ground line as standing', () => {
    expect(shadowRows({ x: 24, y: GROUND + 2 }, GROUND)).toEqual(shadowRows(STANDING, GROUND));
  });
});

describe('drawShadow', () => {
  it('paints one-pixel rows in the shadow color', () => {
    const calls: string[] = [];
    const painter = {
      fillStyle: '',
      fillRect(x: number, y: number, w: number, h: number) {
        calls.push(`${this.fillStyle} ${x},${y} ${w}x${h}`);
      },
    };

    drawShadow(painter, [{ x: 1, y: 2, width: 3 }]);

    expect(calls).toEqual([`${SHADOW_COLOR} 1,2 3x1`]);
  });
});
