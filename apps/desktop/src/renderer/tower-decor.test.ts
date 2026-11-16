import { EMPTY_ROOM, ITEMS, type Room } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { DECOR_SLOTS, drawDecor } from './tower-decor.ts';
import { ROOM_HEIGHT, ROOM_WIDTH } from './tower-room.ts';

/** Records painted pixels as "x,y" → color. */
function recordingPainter() {
  const pixels = new Map<string, string>();
  const painter = {
    fillStyle: '' as string,
    fillRect(x: number, y: number) {
      pixels.set(`${x},${y}`, this.fillStyle);
    },
  };
  return { painter, pixels };
}

describe('drawDecor', () => {
  it('draws nothing in an empty room', () => {
    const { painter, pixels } = recordingPainter();

    drawDecor(painter, EMPTY_ROOM);

    expect(pixels.size).toBe(0);
  });

  it('draws each placed item at its slot, inside the room', () => {
    for (const item of ITEMS.filter(({ kind }) => kind === 'decor')) {
      const { painter, pixels } = recordingPainter();
      const room = { ...EMPTY_ROOM, [item.slot]: item.id } as Room;

      drawDecor(painter, room);

      expect(pixels.size).toBeGreaterThan(0);
      const slot = DECOR_SLOTS[item.slot as keyof typeof DECOR_SLOTS];
      const xs = [...pixels.keys()].map((key) => Number(key.split(',')[0]));
      const ys = [...pixels.keys()].map((key) => Number(key.split(',')[1]));
      // Centered on the slot, and wholly inside the room.
      expect(Math.min(...xs) <= slot.x && slot.x <= Math.max(...xs)).toBe(true);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs)).toBeLessThan(ROOM_WIDTH);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThan(ROOM_HEIGHT);
    }
  });

  it('stands things on their slot and hangs the picture from its nail', () => {
    const shelf = recordingPainter();
    drawDecor(shelf.painter, { ...EMPTY_ROOM, shelf: 'crystalBall' });
    const ys = [...shelf.pixels.keys()].map((key) => Number(key.split(',')[1]));
    expect(Math.max(...ys)).toBe(DECOR_SLOTS.shelf.y - 1); // right on the shelf board

    const wall = recordingPainter();
    drawDecor(wall.painter, { ...EMPTY_ROOM, wall: 'inkDrawing' });
    expect(wall.pixels.get(`${DECOR_SLOTS.wall.x},${DECOR_SLOTS.wall.y}`)).toBe('#5a3d2e'); // the frame
  });

  it('draws nothing for an item that is not decor', () => {
    const { painter, pixels } = recordingPainter();

    drawDecor(painter, { ...EMPTY_ROOM, floor: 'redScarf' });

    expect(pixels.size).toBe(0);
  });
});
