import { describe, expect, it } from 'vitest';
import { isOpaqueAt, type PixelBuffer } from './hit-test.ts';

/** Builds a buffer from rows of '#' (opaque) and '.' (transparent). */
function bufferFrom(rows: string[]): PixelBuffer {
  const width = rows[0]?.length ?? 0;
  const data = rows.flatMap((row) =>
    [...row].flatMap((cell) => (cell === '#' ? [0, 0, 0, 255] : [0, 0, 0, 0])),
  );
  return { width, height: rows.length, data };
}

// 3x3 sprite with a single opaque pixel in the middle.
const DOT = bufferFrom(['...', '.#.', '...']);

describe('isOpaqueAt', () => {
  it('hits an opaque pixel', () => {
    expect(isOpaqueAt(DOT, { x: 1, y: 1 }, 1)).toBe(true);
  });

  it('misses a transparent pixel', () => {
    expect(isOpaqueAt(DOT, { x: 0, y: 0 }, 1)).toBe(false);
  });

  it('maps scaled window coordinates back to sprite pixels', () => {
    // At 3x, sprite pixel (1, 1) covers window pixels 3..5 on both axes.
    expect(isOpaqueAt(DOT, { x: 3, y: 3 }, 3)).toBe(true);
    expect(isOpaqueAt(DOT, { x: 5.9, y: 5.9 }, 3)).toBe(true);
    expect(isOpaqueAt(DOT, { x: 6, y: 3 }, 3)).toBe(false);
    expect(isOpaqueAt(DOT, { x: 2.9, y: 3 }, 3)).toBe(false);
  });

  it('treats any non-zero alpha as opaque', () => {
    const faint = { width: 1, height: 1, data: [0, 0, 0, 1] };

    expect(isOpaqueAt(faint, { x: 0, y: 0 }, 1)).toBe(true);
  });

  it.each([
    ['left', { x: -1, y: 1 }],
    ['top', { x: 1, y: -1 }],
    ['right', { x: 3, y: 1 }],
    ['bottom', { x: 1, y: 3 }],
  ])('misses points beyond the %s edge', (_edge, point) => {
    expect(isOpaqueAt(DOT, point, 1)).toBe(false);
  });

  it('treats missing data as transparent instead of reading past the end', () => {
    const truncated = { width: 2, height: 2, data: [0, 0, 0, 255] };

    expect(isOpaqueAt(truncated, { x: 1, y: 1 }, 1)).toBe(false);
  });

  it('misses everything in an empty buffer', () => {
    expect(isOpaqueAt({ width: 0, height: 0, data: [] }, { x: 0, y: 0 }, 1)).toBe(false);
  });
});
