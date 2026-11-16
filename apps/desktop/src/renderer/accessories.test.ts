import { BARE_LOOK, ITEMS } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { drawAccessories } from './accessories.ts';

const ANCHORS = { head: { x: 23, y: 5 }, neck: { x: 16, y: 25 } };

/** Records painted pixels as "color x,y". */
function recordingPainter() {
  const pixels: string[] = [];
  return {
    pixels,
    fillStyle: '' as string,
    fillRect(x: number, y: number) {
      pixels.push(`${this.fillStyle} ${x},${y}`);
    },
  };
}

const xy = (pixels: string[]) =>
  pixels.map((pixel) => (pixel.split(' ')[1] ?? '').split(',').map(Number) as [number, number]);

describe('drawAccessories', () => {
  it('draws nothing when Mocha wears nothing', () => {
    const painter = recordingPainter();

    drawAccessories(painter, ANCHORS, BARE_LOOK);

    expect(painter.pixels).toEqual([]);
  });

  it('draws a neck accessory around the neck anchor', () => {
    const painter = recordingPainter();

    drawAccessories(painter, ANCHORS, { neck: 'bowTie', hat: null });

    expect(painter.pixels).toHaveLength(13);
    expect(painter.pixels[0]).toBe('#c2213a 13,24');
    expect(painter.pixels).toContain('#7a1020 15,25'); // the knot
  });

  it('draws a hat accessory around the head anchor, after the neck', () => {
    const painter = recordingPainter();

    drawAccessories(painter, ANCHORS, { neck: 'bowTie', hat: 'hatFlower' });

    expect(painter.pixels.at(-1)).toBe('#2fa37a 20,12'); // the flower's leaf
    expect(painter.pixels).toContain('#ffd27a 18,9'); // its heart
  });

  it('follows the anchors as Mocha moves', () => {
    const still = recordingPainter();
    const moved = recordingPainter();

    drawAccessories(still, ANCHORS, { neck: 'redScarf', hat: 'hatFeather' });
    drawAccessories(
      moved,
      { head: { x: 25, y: 1 }, neck: { x: 18, y: 21 } },
      { neck: 'redScarf', hat: 'hatFeather' },
    );

    expect(xy(moved.pixels)).toEqual(xy(still.pixels).map(([x, y]) => [x + 2, y - 4]));
  });

  it('skips an accessory whose anchor the frame does not have', () => {
    const painter = recordingPainter();

    drawAccessories(painter, { head: ANCHORS.head }, { neck: 'redScarf', hat: null });

    expect(painter.pixels).toEqual([]);
  });

  it('has art for every accessory, and stays inside the 48x48 canvas', () => {
    for (const item of ITEMS.filter(({ kind }) => kind === 'accessory')) {
      const painter = recordingPainter();
      const look =
        item.slot === 'neck' ? { neck: item.id, hat: null } : { neck: null, hat: item.id };

      drawAccessories(painter, ANCHORS, look);

      expect(painter.pixels.length).toBeGreaterThan(0);
      for (const [x, y] of xy(painter.pixels)) {
        expect([x, y].every((value) => value >= 0 && value < 48)).toBe(true);
      }
    }
  });

  it('draws nothing for an item that is not worn, such as decor', () => {
    const painter = recordingPainter();

    drawAccessories(painter, ANCHORS, { neck: 'fern', hat: null });

    expect(painter.pixels).toEqual([]);
  });
});
