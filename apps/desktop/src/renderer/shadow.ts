import type { PixelPainter } from './placeholder-sprite.ts';

/**
 * Opacity of the shadow: visible on dark desktops too, yet below the hit
 * test's threshold so clicks on it reach the app underneath.
 */
export const SHADOW_ALPHA = 0.45;
export const SHADOW_COLOR = `rgba(13, 11, 14, ${SHADOW_ALPHA})`;
/** Width of the shadow's widest row when Mocha stands on the ground. */
export const SHADOW_WIDTH = 22;
const MIN_WIDTH = 4;

export interface ShadowRow {
  x: number;
  y: number;
  width: number;
}

/**
 * A flat pixel ellipse under the feet. It stays on the ground line and
 * shrinks by two pixels for every pixel the feet are above it, so a hop
 * reads as height.
 */
export function shadowRows(
  feet: { x: number; y: number },
  groundY: number,
  baseWidth = SHADOW_WIDTH,
): ShadowRow[] {
  const height = Math.max(0, groundY - feet.y);
  const width = Math.max(MIN_WIDTH, baseWidth - 2 * height);
  // feet.x is the left of the two center pixels: centering on feet.x + 1.
  const row = (y: number, rowWidth: number): ShadowRow => ({
    x: feet.x + 1 - rowWidth / 2,
    y,
    width: rowWidth,
  });
  return [
    row(groundY - 1, Math.max(2, width - 8)),
    row(groundY, width),
    row(groundY + 1, Math.max(2, width - 4)),
  ];
}

export function drawShadow(painter: PixelPainter, rows: readonly ShadowRow[]): void {
  painter.fillStyle = SHADOW_COLOR;
  for (const { x, y, width } of rows) painter.fillRect(x, y, width, 1);
}
