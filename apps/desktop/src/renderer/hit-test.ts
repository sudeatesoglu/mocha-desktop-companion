/** RGBA pixels, row by row: the shape of the DOM's ImageData. */
export interface PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: ArrayLike<number>;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Whether a point in window coordinates lies on a visible sprite pixel.
 *
 * The overlay window is a square, but Mocha is not: clicks on transparent
 * pixels must fall through to the app underneath, so hit testing uses the
 * sprite's alpha channel instead of the window bounds.
 */
export function isOpaqueAt(pixels: PixelBuffer, point: Point, scale: number): boolean {
  const x = Math.floor(point.x / scale);
  const y = Math.floor(point.y / scale);
  if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) return false;

  const alpha = pixels.data[(y * pixels.width + x) * 4 + 3] ?? 0;
  return alpha > 0;
}
