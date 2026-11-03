export interface Point {
  x: number;
  y: number;
}

/** One-pixel pupil offset: each axis is -1, 0 or 1. */
export interface Gaze {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

export interface GazeOptions {
  /**
   * Within this distance (same units as the points) the eye looks straight
   * ahead, so the pupil does not flicker while the cursor is on Mocha.
   */
  deadZone?: number;
}

const DEFAULT_DEAD_ZONE = 6;
// Eight 45° sectors; an axis is used when the direction is within 67.5° of it.
const AXIS_THRESHOLD = Math.sin(Math.PI / 8);

const step = (component: number): -1 | 0 | 1 => {
  if (component > AXIS_THRESHOLD) return 1;
  if (component < -AXIS_THRESHOLD) return -1;
  return 0;
};

/**
 * Where the pupil should look: the direction from the eye to the cursor,
 * snapped to the nearest of eight directions. At pixel-art scale the pupil
 * can only move one pixel, so eight directions are all there is.
 */
export function gazeOffset(eye: Point, cursor: Point, options: GazeOptions = {}): Gaze {
  const dx = cursor.x - eye.x;
  const dy = cursor.y - eye.y;
  const distance = Math.hypot(dx, dy);
  if (distance < (options.deadZone ?? DEFAULT_DEAD_ZONE)) return { x: 0, y: 0 };
  return { x: step(dx / distance), y: step(dy / distance) };
}
