import { EMPTY_ROOM, type Room, type TimeOfDay } from '@mocha/core';
import type { PixelPainter } from './placeholder-sprite.ts';
import { drawDecor } from './tower-decor.ts';

/** The room's size in art pixels; CSS scales it up without smoothing. */
export const ROOM_WIDTH = 120;
export const ROOM_HEIGHT = 80;
const FLOOR_Y = 60;

/** Where Mocha's feet stand: on the rug, in the middle of the room. */
export const MOCHA_SPOT = { x: 58, y: 70 } as const;

// A placeholder until the artist's room replaces it (ADR-0008).
const COLORS = {
  moon: '#f6ecd6',
  star: '#c4a8e4',
  sun: '#ffd27a',
  cloud: '#f2eee6',
  frame: '#5a3d2e',
  shelf: '#6b4a3a',
  bookA: '#c4a8e4',
  bookB: '#8e3b4f',
  cup: '#efe2cc',
  coffee: '#8a5a3c',
  rug: '#8e3b4f',
  rugEdge: '#b85a6e',
  candle: '#efe2cc',
  wick: '#2b2630',
  flame: '#ffd27a',
  flameTip: '#e0892b',
  glow: '#7a3b12',
} as const;

/**
 * The room's light for each part of the day, as palettes rather than a
 * translucent tint, so every pixel stays a chosen color. The night
 * colors match the moon from the app icon.
 */
const LIGHT: Record<
  TimeOfDay,
  { wall: string; mortar: string; baseboard: string; floor: string; plank: string; sky: string[] }
> = {
  night: {
    wall: '#3b2f52',
    mortar: '#30264a',
    baseboard: '#4a3324',
    floor: '#7a5638',
    plank: '#66472e',
    sky: ['#2b2143'],
  },
  dawn: {
    wall: '#4a3a5e',
    mortar: '#3d3052',
    baseboard: '#52392a',
    floor: '#86603e',
    plank: '#704e33',
    sky: ['#4a3a6a', '#b8577a', '#e0892b'],
  },
  day: {
    wall: '#5a4a6e',
    mortar: '#4b3d5f',
    baseboard: '#5c412f',
    floor: '#946b45',
    plank: '#7d5839',
    sky: ['#8fb8de'],
  },
  dusk: {
    wall: '#4d3550',
    mortar: '#402b44',
    baseboard: '#523627',
    floor: '#86593a',
    plank: '#704a30',
    sky: ['#3b2f52', '#8e3b4f', '#c2602e'],
  },
};

/** What the room shows: its decor, the part of the day and the candle. */
export interface RoomScene {
  room: Room;
  time: TimeOfDay;
  /** The candle flame's frame, or null while the candle is out. */
  flame: number | null;
}

/** The room as it first appears: empty, at night, the candle out. */
export const NIGHT_SCENE: RoomScene = { room: EMPTY_ROOM, time: 'night', flame: null };

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

/** The window's sky, in bands from the top, with the sun, moon or stars. */
function drawSky(painter: PixelPainter, time: TimeOfDay): void {
  const bands = LIGHT[time].sky;
  const height = Math.ceil(28 / bands.length);
  bands.forEach((color, i) => {
    rect(painter, color, 82, 10 + i * height, 24, Math.min(height, 28 - i * height));
  });
  if (time === 'night') {
    ellipse(painter, COLORS.moon, 97, 20, 6, 6);
    rect(painter, COLORS.star, 86, 14, 1, 1);
    rect(painter, COLORS.star, 89, 31, 1, 1);
  } else if (time === 'day') {
    ellipse(painter, COLORS.sun, 100, 15, 3, 3);
    rect(painter, COLORS.cloud, 84, 29, 8, 2);
    rect(painter, COLORS.cloud, 86, 28, 4, 1);
  } else {
    // A low sun on the horizon: rising at dawn, setting at dusk.
    ellipse(painter, time === 'dawn' ? COLORS.sun : COLORS.flameTip, 88, 36, 3, 3);
  }
  // Clouds and suns may spill over the panes: the frame covers the edges.
  rect(painter, COLORS.frame, 80, 8, 28, 2);
  rect(painter, COLORS.frame, 80, 38, 28, 2);
  rect(painter, COLORS.frame, 80, 8, 2, 32);
  rect(painter, COLORS.frame, 106, 8, 2, 32);
}

/** A candle on the lower shelf; `flame` is its frame, or null when it is out. */
function drawCandle(painter: PixelPainter, flame: number | null): void {
  rect(painter, COLORS.candle, 23, 30, 2, 4);
  rect(painter, COLORS.wick, 24, 29, 1, 1);
  if (flame === null) return;
  // A faint glow on the wall, then the flame leaning one way and the other.
  for (const [x, y] of [
    [21, 27],
    [26, 26],
    [24, 24],
  ] as const) {
    rect(painter, COLORS.glow, x, y, 1, 1);
  }
  const lean = flame % 2 === 0 ? 0 : -1;
  rect(painter, COLORS.flame, 24, 28, 1, 1);
  rect(painter, COLORS.flame, 24 + lean, 27, 1, 1);
  rect(painter, COLORS.flameTip, 24 + lean, 26, 1, 1);
}

/**
 * Draws the Tower's room: a stone wall with a window and two shelves, a
 * floor and a rug, and the decor placed in it. The light and the sky follow
 * the part of the day, and a candle burns when it is lit.
 */
export function drawRoom(painter: PixelPainter, scene: RoomScene = NIGHT_SCENE): void {
  const light = LIGHT[scene.time];
  // Wall with staggered bricks.
  rect(painter, light.wall, 0, 0, ROOM_WIDTH, FLOOR_Y);
  for (let row = 0; row * 6 < FLOOR_Y; row++) {
    const y = row * 6;
    rect(painter, light.mortar, 0, y + 5, ROOM_WIDTH, 1);
    for (let x = row % 2 === 0 ? 0 : 6; x < ROOM_WIDTH; x += 12) {
      rect(painter, light.mortar, x, y, 1, 5);
    }
  }

  // The window, with the sky of the part of the day behind its panes.
  drawSky(painter, scene.time);
  rect(painter, COLORS.frame, 82, 23, 24, 2);
  rect(painter, COLORS.frame, 93, 10, 2, 28);
  // The sill under it, for a decor item.
  rect(painter, COLORS.shelf, 78, 40, 32, 2);

  // An upper shelf for a decor item, and a shelf with two books and a cup
  // of coffee.
  rect(painter, COLORS.shelf, 10, 18, 28, 2);
  rect(painter, COLORS.shelf, 12, 20, 2, 3);
  rect(painter, COLORS.shelf, 34, 20, 2, 3);
  rect(painter, COLORS.shelf, 10, 34, 28, 2);
  rect(painter, COLORS.shelf, 12, 36, 2, 3);
  rect(painter, COLORS.shelf, 34, 36, 2, 3);
  rect(painter, COLORS.bookA, 13, 25, 4, 9);
  rect(painter, COLORS.bookB, 17, 27, 4, 7);
  rect(painter, COLORS.cup, 28, 29, 5, 5);
  rect(painter, COLORS.cup, 33, 30, 1, 3);
  rect(painter, COLORS.coffee, 29, 29, 3, 1);
  drawCandle(painter, scene.flame);

  // Floor boards and a rug under Mocha.
  rect(painter, light.baseboard, 0, FLOOR_Y, ROOM_WIDTH, 2);
  rect(painter, light.floor, 0, FLOOR_Y + 2, ROOM_WIDTH, ROOM_HEIGHT - FLOOR_Y - 2);
  for (let y = FLOOR_Y + 6; y < ROOM_HEIGHT; y += 5)
    rect(painter, light.plank, 0, y, ROOM_WIDTH, 1);
  ellipse(painter, COLORS.rugEdge, MOCHA_SPOT.x, MOCHA_SPOT.y, 24, 5);
  ellipse(painter, COLORS.rug, MOCHA_SPOT.x, MOCHA_SPOT.y, 22, 4);

  drawDecor(painter, scene.room);
}
