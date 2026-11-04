import { describe, expect, it } from 'vitest';
import { createPressGesture, DRAG_THRESHOLD_PX } from './press-gesture.ts';

const ORIGIN = { x: 100, y: 100 };

describe('createPressGesture', () => {
  it('is a click when the pointer is released without moving', () => {
    const press = createPressGesture();
    press.down(ORIGIN);

    expect(press.up()).toBe('click');
  });

  it('is still a click after a tiny shake within the threshold', () => {
    const press = createPressGesture();
    press.down(ORIGIN);

    expect(press.move({ x: ORIGIN.x + DRAG_THRESHOLD_PX, y: ORIGIN.y })).toBeUndefined();
    expect(press.up()).toBe('click');
  });

  it('becomes a drag once the pointer moves beyond the threshold, reported once', () => {
    const press = createPressGesture();
    press.down(ORIGIN);

    expect(press.move({ x: ORIGIN.x + 3, y: ORIGIN.y + 3 })).toBe('drag-start'); // ~4.2 px
    expect(press.move({ x: ORIGIN.x + 50, y: ORIGIN.y })).toBeUndefined();
    expect(press.up()).toBe('drag-end');
  });

  it('reports whether a press is in progress', () => {
    const press = createPressGesture();
    expect(press.pressed).toBe(false);

    press.down(ORIGIN);
    expect(press.pressed).toBe(true);

    press.up();
    expect(press.pressed).toBe(false);
  });

  it('ignores moves and releases without a press', () => {
    const press = createPressGesture();

    expect(press.move({ x: 500, y: 500 })).toBeUndefined();
    expect(press.up()).toBeUndefined();
  });

  it('ends a drag but never clicks when the press is cancelled', () => {
    const dragged = createPressGesture();
    dragged.down(ORIGIN);
    dragged.move({ x: 200, y: 200 });

    expect(dragged.cancel()).toBe('drag-end');

    const tapped = createPressGesture();
    tapped.down(ORIGIN);
    expect(tapped.cancel()).toBeUndefined();
    expect(tapped.pressed).toBe(false);
  });

  it('accepts a custom threshold', () => {
    const press = createPressGesture(10);
    press.down(ORIGIN);

    expect(press.move({ x: ORIGIN.x + 8, y: ORIGIN.y })).toBeUndefined();
    expect(press.move({ x: ORIGIN.x + 11, y: ORIGIN.y })).toBe('drag-start');
  });
});
