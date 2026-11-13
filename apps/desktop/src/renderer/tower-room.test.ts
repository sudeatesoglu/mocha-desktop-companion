import { describe, expect, it } from 'vitest';
import { drawRoom, MOCHA_SPOT, ROOM_HEIGHT, ROOM_WIDTH } from './tower-room.ts';

/** A painter that records the color of every pixel and every rectangle. */
function recordingPainter() {
  const pixels = new Map<string, string>();
  const rects: [number, number, number, number][] = [];
  const painter = {
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push([x, y, w, h]);
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) pixels.set(`${x + dx},${y + dy}`, String(this.fillStyle));
      }
    },
  };
  return { painter, at: (x: number, y: number) => pixels.get(`${x},${y}`), rects };
}

describe('drawRoom', () => {
  it('paints every pixel of the room and nothing outside it', () => {
    const { painter, at, rects } = recordingPainter();

    drawRoom(painter);

    for (const [x, y, w, h] of rects) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(ROOM_WIDTH);
      expect(y + h).toBeLessThanOrEqual(ROOM_HEIGHT);
    }
    for (let y = 0; y < ROOM_HEIGHT; y++) {
      for (let x = 0; x < ROOM_WIDTH; x++) expect(at(x, y)).toBeDefined();
    }
  });

  it('shows the moon in the window and puts Mocha on the rug', () => {
    const { painter, at } = recordingPainter();

    drawRoom(painter);

    expect(at(99, 18)).toBe('#f6ecd6');
    expect(at(MOCHA_SPOT.x, MOCHA_SPOT.y)).toBe('#8e3b4f');
  });
});
