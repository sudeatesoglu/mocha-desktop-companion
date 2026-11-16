import { EMPTY_ROOM } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { drawRoom, MOCHA_SPOT, NIGHT_SCENE, ROOM_HEIGHT, ROOM_WIDTH } from './tower-room.ts';

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

  it.each([
    ['dawn', '#4a3a6a', '#ffd27a'],
    ['day', '#8fb8de', '#ffd27a'],
    ['dusk', '#3b2f52', '#e0892b'],
  ] as const)('shows the %s sky and its sun through the window', (time, topOfSky, sun) => {
    const { painter, at } = recordingPainter();

    drawRoom(painter, { room: EMPTY_ROOM, time, flame: null });

    expect(at(84, 11)).toBe(topOfSky);
    expect([at(88, 36), at(100, 15)]).toContain(sun);
    expect(at(99, 18)).not.toBe('#f6ecd6'); // no moon by day
  });

  it('lights the room by day with lighter walls than at night', () => {
    const night = recordingPainter();
    const day = recordingPainter();

    drawRoom(night.painter);
    drawRoom(day.painter, { ...NIGHT_SCENE, time: 'day' });

    expect(night.at(2, 2)).toBe('#3b2f52');
    expect(day.at(2, 2)).toBe('#5a4a6e');
  });

  it('burns the candle only when it is lit, its flame leaning as it flickers', () => {
    const out = recordingPainter();
    const upright = recordingPainter();
    const leaning = recordingPainter();

    drawRoom(out.painter, NIGHT_SCENE);
    drawRoom(upright.painter, { ...NIGHT_SCENE, flame: 0 });
    drawRoom(leaning.painter, { ...NIGHT_SCENE, flame: 1 });

    expect(out.at(24, 29)).toBe('#2b2630'); // just the wick
    expect(out.at(24, 28)).not.toBe('#ffd27a');
    expect(upright.at(24, 28)).toBe('#ffd27a');
    expect(upright.at(24, 26)).toBe('#e0892b');
    expect(leaning.at(23, 26)).toBe('#e0892b');
  });
});
