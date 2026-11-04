import type { Point } from './overlay-window-options.ts';

export interface WindowDraggerDeps {
  /** Global cursor position in screen coordinates. */
  getCursor(): Point;
  getPosition(): Point;
  setPosition(position: Point): void;
  /** Runs `callback` every `ms` milliseconds until the returned function is called. */
  every(ms: number, callback: () => void): () => void;
  /** Called with the window's position when the user lets go. */
  onDrop(position: Point): void;
}

export interface WindowDragger {
  start(): void;
  end(): void;
  readonly dragging: boolean;
}

/** About 60 moves per second, so the window keeps up with the hand. */
export const DRAG_POLL_MS = 16;

/**
 * Moves a window with the cursor. The main process follows the global
 * cursor, so the drag keeps up even when the cursor outruns the window
 * (a renderer would stop receiving mouse events at that point).
 *
 * The grab offset is kept: the window does not jump to put its corner under
 * the cursor, it stays held where the user grabbed it.
 */
export function createWindowDragger(deps: WindowDraggerDeps): WindowDragger {
  let stop: (() => void) | undefined;
  let offset: Point = { x: 0, y: 0 };
  let last: Point | undefined;

  function follow(): void {
    const cursor = deps.getCursor();
    const target = { x: cursor.x - offset.x, y: cursor.y - offset.y };
    if (last && last.x === target.x && last.y === target.y) return;
    last = target;
    deps.setPosition(target);
  }

  return {
    get dragging() {
      return stop !== undefined;
    },

    start() {
      if (stop) return;
      const cursor = deps.getCursor();
      const position = deps.getPosition();
      offset = { x: cursor.x - position.x, y: cursor.y - position.y };
      last = position;
      stop = deps.every(DRAG_POLL_MS, follow);
    },

    end() {
      if (!stop) return;
      follow(); // catch up with the final cursor position
      stop();
      stop = undefined;
      deps.onDrop(deps.getPosition());
    },
  };
}
