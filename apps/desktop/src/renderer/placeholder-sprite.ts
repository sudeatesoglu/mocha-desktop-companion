import type { SkinManifest } from '@mocha/core';
import { drawPupil } from './pupil.ts';

/** The drawing calls the placeholder needs; CanvasRenderingContext2D satisfies it. */
export interface PixelPainter {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, width: number, height: number): void;
}

/** [color, x, y, width, height] in sprite pixels. */
type Block = readonly [string, number, number, number, number];

// Blocky stand-in for Mocha until skins are loaded from sprite sheets (#20).
// Colors come from the ink palette.
export const PLACEHOLDER_BLOCKS: readonly Block[] = [
  ['#0d0b0e', 12, 16, 24, 24], // body
  ['#0d0b0e', 16, 8, 16, 12], // head
  ['#5a5260', 32, 13, 7, 3], // beak
  ['#f2eee6', 22, 11, 5, 5], // eye white
];

/** Where the placeholder's pupil sits when Mocha looks straight ahead. */
export const PUPIL_POSITION = { x: 23, y: 12 } as const;

export interface PlaceholderPose {
  /** Vertical shift in sprite pixels (breathing). */
  offsetY: number;
  /** Whether the cursor is over Mocha; shown as a red pupil. */
  hovered: boolean;
}

/** Draws the placeholder in the given pose. */
export function drawPlaceholderMocha(painter: PixelPainter, pose: PlaceholderPose): void {
  for (const [color, x, y, width, height] of PLACEHOLDER_BLOCKS) {
    painter.fillStyle = color;
    painter.fillRect(x, y + pose.offsetY, width, height);
  }
  drawPupil(painter, { x: PUPIL_POSITION.x, y: PUPIL_POSITION.y + pose.offsetY }, pose.hovered);
}

/** Animations for the placeholder: two idle poses, bobbing by one pixel. */
export const PLACEHOLDER_ANIMATIONS: SkinManifest['animations'] = {
  idle: {
    loop: true,
    frames: [
      { index: 0, durationMs: 800 },
      { index: 1, durationMs: 800 },
    ],
  },
};
