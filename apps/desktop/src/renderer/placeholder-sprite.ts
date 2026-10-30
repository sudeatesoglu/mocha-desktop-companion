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
  ['#0d0b0e', 23, 12, 2, 2], // pupil
];

export function drawPlaceholderMocha(painter: PixelPainter): void {
  for (const [color, x, y, width, height] of PLACEHOLDER_BLOCKS) {
    painter.fillStyle = color;
    painter.fillRect(x, y, width, height);
  }
}
