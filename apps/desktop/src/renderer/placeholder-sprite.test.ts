import { describe, expect, it } from 'vitest';
import { SPRITE_SIZE } from '../shared/overlay.ts';
import {
  drawPlaceholderMocha,
  type PixelPainter,
  PLACEHOLDER_BLOCKS,
  PUPIL,
} from './placeholder-sprite.ts';

/** Records every fillRect call as "color x,y wxh". */
function recordingPainter(): PixelPainter & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fillStyle: '',
    fillRect(x, y, width, height) {
      calls.push(`${String(this.fillStyle)} ${x},${y} ${width}x${height}`);
    },
  };
}

describe('drawPlaceholderMocha', () => {
  it('paints every block and then the pupil', () => {
    const painter = recordingPainter();

    drawPlaceholderMocha(painter, { offsetY: 0, hovered: false });

    expect(painter.calls).toEqual([
      ...PLACEHOLDER_BLOCKS.map(([c, x, y, w, h]) => `${c} ${x},${y} ${w}x${h}`),
      `${PUPIL.color} ${PUPIL.x},${PUPIL.y} ${PUPIL.size}x${PUPIL.size}`,
    ]);
  });

  it('turns the pupil red while hovered', () => {
    const painter = recordingPainter();

    drawPlaceholderMocha(painter, { offsetY: 0, hovered: true });

    expect(painter.calls.at(-1)).toBe(
      `${PUPIL.hoverColor} ${PUPIL.x},${PUPIL.y} ${PUPIL.size}x${PUPIL.size}`,
    );
  });

  it('shifts everything down by the offset', () => {
    const ys: number[] = [];
    const painter: PixelPainter = { fillStyle: '', fillRect: (_x, y) => ys.push(y) };

    drawPlaceholderMocha(painter, { offsetY: 1, hovered: false });

    expect(ys).toEqual([...PLACEHOLDER_BLOCKS.map(([, , y]) => y + 1), PUPIL.y + 1]);
  });

  it('stays inside the sprite canvas in every breathing pose', () => {
    const maxOffset = 1;
    const rects = [
      ...PLACEHOLDER_BLOCKS.map(([, x, y, width, height]) => ({ x, y, width, height })),
      { x: PUPIL.x, y: PUPIL.y, width: PUPIL.size, height: PUPIL.size },
    ];
    for (const { x, y, width, height } of rects) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(SPRITE_SIZE);
      expect(y + height + maxOffset).toBeLessThanOrEqual(SPRITE_SIZE);
    }
  });
});
