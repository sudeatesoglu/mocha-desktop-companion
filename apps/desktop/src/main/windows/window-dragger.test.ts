import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Point } from './overlay-window-options.ts';
import { createWindowDragger, DRAG_POLL_MS } from './window-dragger.ts';

describe('createWindowDragger', () => {
  let cursor: Point;
  let position: Point;
  let tick: (() => void) | undefined;
  const stopPolling = vi.fn();
  const onDrop = vi.fn<(position: Point) => void>();
  const setPosition = vi.fn((next: Point) => {
    position = next;
  });
  const every = vi.fn((_ms: number, callback: () => void) => {
    tick = callback;
    return stopPolling;
  });

  const dragger = () =>
    createWindowDragger({
      getCursor: () => cursor,
      getPosition: () => position,
      setPosition,
      every,
      onDrop,
    });

  beforeEach(() => {
    cursor = { x: 1300, y: 800 };
    position = { x: 1272, y: 732 }; // grabbed 28 px right, 68 px down from the corner
    tick = undefined;
    vi.clearAllMocks();
  });

  it('follows the cursor at about 60 Hz once started', () => {
    const drag = dragger();

    drag.start();

    expect(every).toHaveBeenCalledWith(DRAG_POLL_MS, expect.any(Function));
    expect(drag.dragging).toBe(true);
  });

  it('keeps the grab offset instead of jumping to the cursor', () => {
    dragger().start();

    cursor = { x: 1000, y: 500 };
    tick?.();

    expect(setPosition).toHaveBeenLastCalledWith({ x: 972, y: 432 });
  });

  it('does not move the window while the cursor rests', () => {
    dragger().start();
    tick?.();
    tick?.();

    expect(setPosition).not.toHaveBeenCalled();
  });

  it('catches up with the cursor, stops polling and reports the drop position', () => {
    const drag = dragger();
    drag.start();
    cursor = { x: 900, y: 400 }; // moved after the last poll

    drag.end();

    expect(setPosition).toHaveBeenLastCalledWith({ x: 872, y: 332 });
    expect(stopPolling).toHaveBeenCalledOnce();
    expect(onDrop).toHaveBeenCalledWith({ x: 872, y: 332 });
    expect(drag.dragging).toBe(false);
  });

  it('ignores a second start and an end without a start', () => {
    const drag = dragger();

    drag.end();
    drag.start();
    drag.start();

    expect(every).toHaveBeenCalledOnce();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('can be dragged again after a drop', () => {
    const drag = dragger();
    drag.start();
    drag.end();

    drag.start();

    expect(every).toHaveBeenCalledTimes(2);
    expect(drag.dragging).toBe(true);
  });
});
