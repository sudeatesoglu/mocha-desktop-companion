import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CURSOR_POLL_MS, type Point, startCursorTracker } from './cursor-tracker.ts';

describe('startCursorTracker', () => {
  let cursor: Point;
  let origin: Point;
  let tick: (() => void) | undefined;
  const send = vi.fn<(point: Point) => void>();
  const stopInterval = vi.fn();

  const start = () =>
    startCursorTracker({
      getCursor: () => cursor,
      getOrigin: () => origin,
      send,
      every: (_ms, callback) => {
        tick = callback;
        return stopInterval;
      },
    });

  beforeEach(() => {
    cursor = { x: 500, y: 300 };
    origin = { x: 400, y: 200 };
    tick = undefined;
    send.mockClear();
    stopInterval.mockClear();
  });

  it('polls at about 30 Hz by default', () => {
    const every = vi.fn(() => () => {});
    startCursorTracker({ getCursor: () => cursor, getOrigin: () => origin, send, every });

    expect(every).toHaveBeenCalledWith(CURSOR_POLL_MS, expect.any(Function));
    expect(CURSOR_POLL_MS).toBeLessThanOrEqual(34);
  });

  it('sends the cursor position relative to the window', () => {
    start();

    tick?.();

    expect(send).toHaveBeenCalledWith({ x: 100, y: 100 });
  });

  it('sends nothing while the cursor is still', () => {
    start();
    tick?.();
    tick?.();
    tick?.();

    expect(send).toHaveBeenCalledOnce();
  });

  it('sends again when the cursor moves', () => {
    start();
    tick?.();

    cursor = { x: 510, y: 300 };
    tick?.();

    expect(send).toHaveBeenLastCalledWith({ x: 110, y: 100 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('sends when the window moves under a still cursor', () => {
    start();
    tick?.();

    origin = { x: 300, y: 200 }; // the overlay was dragged
    tick?.();

    expect(send).toHaveBeenLastCalledWith({ x: 200, y: 100 });
  });

  it('reports positions outside the window too', () => {
    start();
    cursor = { x: 0, y: 0 };

    tick?.();

    expect(send).toHaveBeenCalledWith({ x: -400, y: -200 });
  });

  it('returns a function that stops polling', () => {
    const stop = start();

    stop();

    expect(stopInterval).toHaveBeenCalledOnce();
  });
});
