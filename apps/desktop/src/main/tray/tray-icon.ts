/**
 * Mocha's menu-bar icon: the top-hatted raven head in profile, drawn as a
 * 16x16 mask. macOS shows menu-bar icons as template images: only the
 * alpha channel matters and the system tints the shape for light and dark
 * menu bars. Drawing it in code means no image file to bundle or locate.
 */
// biome-ignore format: laid out as the pixel grid it draws
const MASK = [
  '................',
  '.....######.....',
  '.....######.....',
  '.....######.....',
  '.....######.....',
  '...##########...',
  '....########....',
  '...##########...',
  '...##..#######..',
  '##############..',
  '.#############..',
  '...###########..',
  '....#########...',
  '.....#######....',
  '......#####.....',
  '................',
] as const;

export const TRAY_ICON_POINTS = MASK.length;

export interface Bitmap {
  width: number;
  height: number;
  /** 4 bytes per pixel, row by row. */
  data: Uint8Array;
}

/**
 * The icon as a raw bitmap at `scale` (1 for regular, 2 for Retina),
 * upscaled without smoothing to keep pixel edges crisp.
 *
 * Every color byte is 0 and only alpha varies, so the result is correct
 * whatever channel order the platform expects (RGBA or BGRA).
 */
export function trayIconBitmap(scale: 1 | 2): Bitmap {
  const size = TRAY_ICON_POINTS * scale;
  const data = new Uint8Array(size * size * 4);
  MASK.forEach((row, my) => {
    [...row].forEach((cell, mx) => {
      if (cell !== '#') return;
      // Each mask point becomes a scale x scale block of opaque pixels.
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          data[((my * scale + dy) * size + mx * scale + dx) * 4 + 3] = 255;
        }
      }
    });
  });
  return { width: size, height: size, data };
}
