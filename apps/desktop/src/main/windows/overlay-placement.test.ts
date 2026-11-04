import { describe, expect, it } from 'vitest';
import { OVERLAY_MARGIN, OVERLAY_SIZE } from '../../shared/overlay.ts';
import { clampToArea, initialOverlayPosition, placeOnDisplays } from './overlay-placement.ts';

const SIZE = 144;
const LAPTOP = { x: 0, y: 25, width: 1440, height: 875 };
// An external monitor to the left of the laptop, slightly higher.
const MONITOR = { x: -1920, y: -200, width: 1920, height: 1080 };

describe('clampToArea', () => {
  it('keeps a position that is already fully inside', () => {
    expect(clampToArea({ x: 100, y: 100 }, SIZE, LAPTOP)).toEqual({ x: 100, y: 100 });
  });

  it('pulls a window that sticks out of an edge back inside', () => {
    expect(clampToArea({ x: 1400, y: 850 }, SIZE, LAPTOP)).toEqual({ x: 1296, y: 756 });
    expect(clampToArea({ x: -50, y: 0 }, SIZE, LAPTOP)).toEqual({ x: 0, y: 25 });
  });

  it('aligns to the top-left when the area is smaller than the window', () => {
    expect(clampToArea({ x: 50, y: 50 }, SIZE, { x: 10, y: 10, width: 100, height: 100 })).toEqual({
      x: 10,
      y: 10,
    });
  });
});

describe('placeOnDisplays', () => {
  it('keeps the window on the display under its center', () => {
    expect(placeOnDisplays({ x: -1000, y: 300 }, SIZE, [LAPTOP, MONITOR])).toEqual({
      x: -1000,
      y: 300,
    });
  });

  it('clamps a window dropped across an edge onto the display under its center', () => {
    // Center at x = -10: on the monitor, but the window overlaps the laptop.
    expect(placeOnDisplays({ x: -82, y: 300 }, SIZE, [LAPTOP, MONITOR])).toEqual({
      x: -SIZE,
      y: 300,
    });
  });

  it('brings back a window whose display was unplugged', () => {
    // Saved on the monitor, which is gone now: move to the nearest display.
    expect(placeOnDisplays({ x: -1000, y: 300 }, SIZE, [LAPTOP])).toEqual({ x: 0, y: 300 });
  });

  it('picks the nearest display when the window is off every display', () => {
    const far = placeOnDisplays({ x: -5000, y: 5000 }, SIZE, [LAPTOP, MONITOR]);

    expect(far).toEqual({ x: -1920, y: 880 - SIZE });
  });

  it('does not depend on the order in which displays are listed', () => {
    for (const position of [
      { x: -1000, y: 300 },
      { x: 500, y: 300 },
      { x: -5000, y: 5000 },
    ]) {
      expect(placeOnDisplays(position, SIZE, [MONITOR, LAPTOP])).toEqual(
        placeOnDisplays(position, SIZE, [LAPTOP, MONITOR]),
      );
    }
  });

  it('leaves the position alone when no display is known', () => {
    expect(placeOnDisplays({ x: 7, y: 9 }, SIZE, [])).toEqual({ x: 7, y: 9 });
  });
});

describe('initialOverlayPosition', () => {
  it('starts in the bottom-right corner of the primary display the first time', () => {
    expect(initialOverlayPosition(undefined, LAPTOP, [LAPTOP])).toEqual({
      x: LAPTOP.x + LAPTOP.width - OVERLAY_SIZE - OVERLAY_MARGIN,
      y: LAPTOP.y + LAPTOP.height - OVERLAY_SIZE - OVERLAY_MARGIN,
    });
  });

  it('restores the saved position', () => {
    expect(initialOverlayPosition({ x: 200, y: 300 }, LAPTOP, [LAPTOP])).toEqual({
      x: 200,
      y: 300,
    });
  });

  it('keeps a restored position on screen', () => {
    expect(initialOverlayPosition({ x: 5000, y: 300 }, LAPTOP, [LAPTOP])).toEqual({
      x: LAPTOP.width - OVERLAY_SIZE,
      y: 300,
    });
  });
});
