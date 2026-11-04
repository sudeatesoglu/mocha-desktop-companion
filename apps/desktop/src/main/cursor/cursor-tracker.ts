export interface Point {
  x: number;
  y: number;
}

export interface CursorTrackerDeps {
  /** Global cursor position in screen coordinates. */
  getCursor(): Point;
  /** Top-left of the window's content in screen coordinates. */
  getOrigin(): Point;
  /** Delivers a window-relative position to the renderer. */
  send(point: Point): void;
  /** Runs `callback` every `ms` milliseconds until the returned function is called. */
  every(ms: number, callback: () => void): () => void;
}

/** About 30 checks per second: smooth for an eye, cheap for the CPU. */
export const CURSOR_POLL_MS = 33;

/**
 * Tells the overlay where the cursor is, relative to the window, wherever it
 * is on screen. A renderer only receives mouse events over its own window,
 * so the main process polls the global position. A message is sent only
 * when the relative position changes: a still cursor costs no IPC.
 *
 * Returns a function that stops tracking.
 */
export function startCursorTracker(deps: CursorTrackerDeps, intervalMs = CURSOR_POLL_MS) {
  let last: Point | undefined;
  return deps.every(intervalMs, () => {
    const cursor = deps.getCursor();
    const origin = deps.getOrigin();
    const point = { x: cursor.x - origin.x, y: cursor.y - origin.y };
    if (last && last.x === point.x && last.y === point.y) return;
    last = point;
    deps.send(point);
  });
}
