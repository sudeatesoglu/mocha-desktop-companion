import { describe, expect, it } from 'vitest';
import { createEffects } from './effects.ts';

const HEAD = { x: 23, y: 5 };

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

const topOf = (pixels: string[]) => Math.min(...pixels.map((pixel) => Number(pixel.split(',')[1])));

describe('createEffects', () => {
  it('draws nothing until an effect is added', () => {
    const painter = recordingPainter();

    createEffects().draw(painter, HEAD);

    expect(painter.pixels).toEqual([]);
  });

  it('draws a red heart beside the hat that rises over time', () => {
    const effects = createEffects();
    effects.add('heart');
    const first = recordingPainter();
    effects.draw(first, HEAD);

    effects.update(300);
    const later = recordingPainter();
    effects.draw(later, HEAD);

    expect(first.pixels.every((pixel) => pixel.startsWith('#c2213a'))).toBe(true);
    expect(first.pixels).toHaveLength(11);
    expect(topOf(later.pixels)).toBe(topOf(first.pixels) - 1);
  });

  it('keeps every pixel inside the 48x48 canvas for the default head position', () => {
    const effects = createEffects();
    effects.add('heart');
    effects.add('stars');
    for (let t = 0; t < 1_800; t += 50) {
      const painter = recordingPainter();
      effects.draw(painter, HEAD);
      for (const pixel of painter.pixels) {
        const [x, y] = (pixel.split(' ')[1] ?? '').split(',').map(Number);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(48);
        expect(y).toBeLessThan(48);
      }
      effects.update(50);
    }
  });

  it('draws two stars that move around the hat', () => {
    const effects = createEffects();
    effects.add('stars');
    const first = recordingPainter();
    effects.draw(first, HEAD);

    effects.update(150);
    const next = recordingPainter();
    effects.draw(next, HEAD);

    expect(first.pixels).toHaveLength(10); // two five-pixel stars
    expect(next.pixels).not.toEqual(first.pixels);
  });

  it('follows the head anchor', () => {
    const effects = createEffects();
    effects.add('heart');
    const here = recordingPainter();
    const lower = recordingPainter();

    effects.draw(here, HEAD);
    effects.draw(lower, { x: HEAD.x, y: HEAD.y + 2 });

    expect(topOf(lower.pixels)).toBe(topOf(here.pixels) + 2);
  });

  it('reports a change only when an effect looks different', () => {
    const effects = createEffects();
    effects.add('heart');

    expect(effects.update(100)).toBe(false); // same heart position
    expect(effects.update(200)).toBe(true); // rose by a pixel
  });

  it('removes an effect when it expires, reporting the change', () => {
    const effects = createEffects();
    effects.add('heart');
    effects.update(1_100);

    expect(effects.update(100)).toBe(true);
    const painter = recordingPainter();
    effects.draw(painter, HEAD);
    expect(painter.pixels).toEqual([]);
  });

  it('restarts an effect that is added again', () => {
    const effects = createEffects();
    effects.add('heart');
    effects.update(1_100);

    effects.add('heart');
    effects.update(1_000);

    const painter = recordingPainter();
    effects.draw(painter, HEAD);
    expect(painter.pixels).toHaveLength(11);
  });

  it('can be cleared at once', () => {
    const effects = createEffects();
    effects.add('heart');
    effects.add('stars');

    effects.clear();

    const painter = recordingPainter();
    effects.draw(painter, HEAD);
    expect(painter.pixels).toEqual([]);
  });

  it('draws nothing when there is no head anchor', () => {
    const effects = createEffects();
    effects.add('heart');
    const painter = recordingPainter();

    effects.draw(painter, undefined);

    expect(painter.pixels).toEqual([]);
  });
});
