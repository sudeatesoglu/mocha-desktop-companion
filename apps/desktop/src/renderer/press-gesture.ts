export interface Point {
  x: number;
  y: number;
}

export interface PressGesture {
  /** A button is held down on Mocha. */
  readonly pressed: boolean;
  down(at: Point): void;
  /** Returns "drag-start" once the press has moved far enough to be a drag. */
  move(to: Point): 'drag-start' | undefined;
  /** Button released: a click if it never became a drag. */
  up(): 'click' | 'drag-end' | undefined;
  /** The press was interrupted (e.g. pointer capture lost): never a click. */
  cancel(): 'drag-end' | undefined;
}

/** Movement below this many pixels still counts as a click (hands shake). */
export const DRAG_THRESHOLD_PX = 3;

/**
 * Tells a click from a drag. A press becomes a drag only after the pointer
 * moved more than a few pixels; otherwise releasing it is a click. Points
 * are in screen coordinates, because the window moves during a drag.
 */
export function createPressGesture(thresholdPx = DRAG_THRESHOLD_PX): PressGesture {
  let start: Point | undefined;
  let dragging = false;

  const reset = () => {
    start = undefined;
    dragging = false;
  };

  return {
    get pressed() {
      return start !== undefined;
    },

    down(at) {
      start = at;
      dragging = false;
    },

    move(to) {
      if (!start || dragging) return undefined;
      if (Math.hypot(to.x - start.x, to.y - start.y) <= thresholdPx) return undefined;
      dragging = true;
      return 'drag-start';
    },

    up() {
      if (!start) return undefined;
      const outcome = dragging ? 'drag-end' : 'click';
      reset();
      return outcome;
    },

    cancel() {
      const outcome = dragging ? 'drag-end' : undefined;
      reset();
      return outcome;
    },
  };
}
