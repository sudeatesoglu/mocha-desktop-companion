import { describe, expect, it } from 'vitest';
import { TRAY_ICON_POINTS, trayIconBitmap } from './tray-icon.ts';

const alphaAt = (bitmap: ReturnType<typeof trayIconBitmap>, x: number, y: number) =>
  bitmap.data[(y * bitmap.width + x) * 4 + 3];

describe('trayIconBitmap', () => {
  it('is 16x16 at regular resolution and 32x32 on Retina', () => {
    expect(trayIconBitmap(1)).toMatchObject({ width: 16, height: 16 });
    expect(trayIconBitmap(2)).toMatchObject({ width: 32, height: 32 });
    expect(trayIconBitmap(2).data).toHaveLength(32 * 32 * 4);
    expect(TRAY_ICON_POINTS).toBe(16);
  });

  it('is a template image: all color bytes are zero, only alpha varies', () => {
    const { data } = trayIconBitmap(2);
    for (let i = 0; i < data.length; i += 4) {
      expect([data[i], data[i + 1], data[i + 2]]).toEqual([0, 0, 0]);
      expect([0, 255]).toContain(data[i + 3]);
    }
  });

  it('draws the hat, the beak and a see-through eye', () => {
    const icon = trayIconBitmap(1);

    expect(alphaAt(icon, 7, 2)).toBe(255); // hat crown
    expect(alphaAt(icon, 0, 9)).toBe(255); // beak tip
    expect(alphaAt(icon, 5, 8)).toBe(0); // eye
    expect(alphaAt(icon, 0, 0)).toBe(0); // background
  });

  it('upscales each point to a 2x2 block on Retina, without smoothing', () => {
    const regular = trayIconBitmap(1);
    const retina = trayIconBitmap(2);

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const alpha = alphaAt(regular, x, y);
        expect(alphaAt(retina, 2 * x, 2 * y)).toBe(alpha);
        expect(alphaAt(retina, 2 * x + 1, 2 * y + 1)).toBe(alpha);
      }
    }
  });
});
