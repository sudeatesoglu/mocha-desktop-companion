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

/** The pupil is drawn separately because its color shows the hover state. */
export const PUPIL = { x: 23, y: 12, size: 2, color: '#0d0b0e', hoverColor: '#c2213a' } as const;

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
  // Hover feedback lives in Mocha's own pixels, not the system cursor:
  // macOS only lets the active app change the cursor, and the overlay
  // never activates so it does not steal focus.
  painter.fillStyle = pose.hovered ? PUPIL.hoverColor : PUPIL.color;
  painter.fillRect(PUPIL.x, PUPIL.y + pose.offsetY, PUPIL.size, PUPIL.size);
}
