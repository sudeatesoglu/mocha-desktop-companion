import type { PixelPainter } from './placeholder-sprite.ts';

/** The room's size in art pixels; CSS scales it up without smoothing. */
export const ROOM_WIDTH = 120;
export const ROOM_HEIGHT = 80;
const FLOOR_Y = 60;

/** Where Mocha's feet stand: on the rug, in the middle of the room. */
export const MOCHA_SPOT = { x: 58, y: 70 } as const;

// A placeholder until the artist's room replaces it (ADR-0008). Night
// colors, so the window shows the moon from the app icon.
const COLORS = {
  wall: '#3b2f52',
  mortar: '#30264a',
  sky: '#2b2143',
  moon: '#f6ecd6',
  star: '#c4a8e4',
  frame: '#5a3d2e',
  shelf: '#6b4a3a',
  bookA: '#c4a8e4',
  bookB: '#8e3b4f',
  cup: '#efe2cc',
  coffee: '#8a5a3c',
  baseboard: '#4a3324',
  floor: '#7a5638',
  plank: '#66472e',
  rug: '#8e3b4f',
  rugEdge: '#b85a6e',
} as const;

function rect(painter: PixelPainter, color: string, x: number, y: number, w: number, h: number) {
  painter.fillStyle = color;
  painter.fillRect(x, y, w, h);
}

/** A filled ellipse, one row at a time, so it stays on the pixel grid. */
function ellipse(
  painter: PixelPainter,
  color: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
) {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2));
    rect(painter, color, cx - half, cy + dy, half * 2 + 1, 1);
  }
}

/** Draws the Tower's room: a stone wall with a moonlit window and a shelf, a floor and a rug. */
export function drawRoom(painter: PixelPainter): void {
  // Wall with staggered bricks.
  rect(painter, COLORS.wall, 0, 0, ROOM_WIDTH, FLOOR_Y);
  for (let row = 0; row * 6 < FLOOR_Y; row++) {
    const y = row * 6;
    rect(painter, COLORS.mortar, 0, y + 5, ROOM_WIDTH, 1);
    for (let x = row % 2 === 0 ? 0 : 6; x < ROOM_WIDTH; x += 12) {
      rect(painter, COLORS.mortar, x, y, 1, 5);
    }
  }

  // The window, with the moon and two stars behind its panes.
  rect(painter, COLORS.frame, 80, 8, 28, 32);
  rect(painter, COLORS.sky, 82, 10, 24, 28);
  ellipse(painter, COLORS.moon, 97, 20, 6, 6);
  rect(painter, COLORS.star, 86, 14, 1, 1);
  rect(painter, COLORS.star, 89, 31, 1, 1);
  rect(painter, COLORS.frame, 82, 23, 24, 2);
  rect(painter, COLORS.frame, 93, 10, 2, 28);

  // A shelf with two books and a cup of coffee.
  rect(painter, COLORS.shelf, 10, 34, 28, 2);
  rect(painter, COLORS.shelf, 12, 36, 2, 3);
  rect(painter, COLORS.shelf, 34, 36, 2, 3);
  rect(painter, COLORS.bookA, 13, 25, 4, 9);
  rect(painter, COLORS.bookB, 17, 27, 4, 7);
  rect(painter, COLORS.cup, 28, 29, 5, 5);
  rect(painter, COLORS.cup, 33, 30, 1, 3);
  rect(painter, COLORS.coffee, 29, 29, 3, 1);

  // Floor boards and a rug under Mocha.
  rect(painter, COLORS.baseboard, 0, FLOOR_Y, ROOM_WIDTH, 2);
  rect(painter, COLORS.floor, 0, FLOOR_Y + 2, ROOM_WIDTH, ROOM_HEIGHT - FLOOR_Y - 2);
  for (let y = FLOOR_Y + 6; y < ROOM_HEIGHT; y += 5)
    rect(painter, COLORS.plank, 0, y, ROOM_WIDTH, 1);
  ellipse(painter, COLORS.rugEdge, MOCHA_SPOT.x, MOCHA_SPOT.y, 24, 5);
  ellipse(painter, COLORS.rug, MOCHA_SPOT.x, MOCHA_SPOT.y, 22, 4);
}
