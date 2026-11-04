import { OVERLAY_MARGIN, OVERLAY_SIZE } from '../../shared/overlay.ts';
import { bottomRightPosition, type Point, type Rect } from './overlay-window-options.ts';

/** Moves a square window of `size` so it lies fully inside `area`. */
export function clampToArea(position: Point, size: number, area: Rect): Point {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  return {
    x: clamp(position.x, area.x, area.x + area.width - size),
    y: clamp(position.y, area.y, area.y + area.height - size),
  };
}

/** Distance from a point to the nearest edge of a rectangle (0 if inside). */
function distanceToArea(point: Point, area: Rect): number {
  const dx = Math.max(area.x - point.x, 0, point.x - (area.x + area.width));
  const dy = Math.max(area.y - point.y, 0, point.y - (area.y + area.height));
  return Math.hypot(dx, dy);
}

/**
 * Keeps the overlay fully visible on one of the available displays.
 *
 * The display is the one under the window's center, or the nearest one if
 * the center is off every display (for example after a monitor was
 * unplugged). Mocha must never end up somewhere the user cannot see it.
 */
export function placeOnDisplays(position: Point, size: number, workAreas: readonly Rect[]): Point {
  const [first, ...rest] = workAreas;
  if (!first) return position;

  const center = { x: position.x + size / 2, y: position.y + size / 2 };
  let best = first;
  for (const area of rest) {
    if (distanceToArea(center, area) < distanceToArea(center, best)) best = area;
  }
  return clampToArea(position, size, best);
}

/**
 * Where the overlay starts: the saved position if there is one (kept on a
 * visible display), otherwise the bottom-right corner of the primary display.
 */
export function initialOverlayPosition(
  saved: Point | undefined,
  primaryWorkArea: Rect,
  workAreas: readonly Rect[],
): Point {
  if (!saved) return bottomRightPosition(primaryWorkArea, OVERLAY_SIZE, OVERLAY_MARGIN);
  return placeOnDisplays(saved, OVERLAY_SIZE, workAreas);
}
