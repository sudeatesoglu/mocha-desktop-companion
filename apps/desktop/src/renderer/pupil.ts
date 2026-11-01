import type { PixelPainter } from './placeholder-sprite.ts';

export const PUPIL_SIZE = 2;
export const PUPIL_COLOR = '#0d0b0e';
/** Hover feedback lives in Mocha's own pixels, not the system cursor (#32). */
export const PUPIL_HOVER_COLOR = '#c2213a';

/**
 * Draws the pupil with its top-left corner at `at` (sprite pixels). The app
 * draws pupils instead of the art, so the eye can follow the cursor and
 * show hover without extra frames.
 */
export function drawPupil(painter: PixelPainter, at: { x: number; y: number }, hovered: boolean) {
  painter.fillStyle = hovered ? PUPIL_HOVER_COLOR : PUPIL_COLOR;
  painter.fillRect(at.x, at.y, PUPIL_SIZE, PUPIL_SIZE);
}
