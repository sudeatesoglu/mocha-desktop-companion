import { describe, expect, it } from 'vitest';
import { SPRITE_SIZE } from '../shared/overlay.ts';
import {
  drawPlaceholderMocha,
  type PixelPainter,
  PLACEHOLDER_BLOCKS,
} from './placeholder-sprite.ts';

describe('drawPlaceholderMocha', () => {
  it('paints every block with its own color', () => {
    const calls: string[] = [];
    const painter: PixelPainter = {
      fillStyle: '',
      fillRect(x, y, width, height) {
        calls.push(`${String(this.fillStyle)} ${x},${y} ${width}x${height}`);
      },
    };

    drawPlaceholderMocha(painter);

    expect(calls).toEqual(PLACEHOLDER_BLOCKS.map(([c, x, y, w, h]) => `${c} ${x},${y} ${w}x${h}`));
  });

  it('shifts every block down by the offset', () => {
    const ys: number[] = [];
    const painter: PixelPainter = { fillStyle: '', fillRect: (_x, y) => ys.push(y) };

    drawPlaceholderMocha(painter, 1);

    expect(ys).toEqual(PLACEHOLDER_BLOCKS.map(([, , y]) => y + 1));
  });

  it('stays inside the sprite canvas in every breathing pose', () => {
    const maxOffset = 1;
    for (const [, x, y, width, height] of PLACEHOLDER_BLOCKS) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(SPRITE_SIZE);
      expect(y + height + maxOffset).toBeLessThanOrEqual(SPRITE_SIZE);
    }
  });
});
