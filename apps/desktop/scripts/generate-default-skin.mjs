// Generates the placeholder "default" skin: a 48x48 raven in the ink
// palette, drawn from simple shapes, plus its manifest.
//
// The final art will be hand-drawn; this keeps the app usable until then.
// Run: node apps/desktop/scripts/generate-default-skin.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

const SIZE = 48;
const OUT_DIR = join(import.meta.dirname, '../src/renderer/skins/default');

// Ink palette (see docs/skins.md).
const PALETTE = {
  K: [0x0d, 0x0b, 0x0e], // ink black
  D: [0x2b, 0x26, 0x30], // deep shadow
  M: [0x5a, 0x52, 0x60], // mid gray
  L: [0xa8, 0xa1, 0xa6], // light gray
  W: [0xf2, 0xee, 0xe6], // paper white
  R: [0xc2, 0x21, 0x3a], // blood red
  r: [0x7a, 0x10, 0x20], // dark red
};

// --- drawing helpers on a 48x48 grid of palette keys (null = transparent) ---

const blank = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
const clone = (grid) => grid.map((row) => [...row]);

function set(grid, x, y, color) {
  if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) grid[y][x] = color;
}

function rect(grid, x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(grid, x, y, color);
}

/** Fills an ellipse; `paint(x, y)` picks the color, so patterns are possible. */
function ellipse(grid, cx, cy, rx, ry, paint) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1)
        set(grid, x, y, typeof paint === 'function' ? paint(x, y) : paint);
    }
  }
}

/** Adds a 1px ink outline around every shape (4-neighborhood). */
function outline(grid) {
  const result = clone(grid);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (grid[y][x] !== null) continue;
      const neighbors = [grid[y - 1]?.[x], grid[y + 1]?.[x], grid[y]?.[x - 1], grid[y]?.[x + 1]];
      if (neighbors.some((color) => color && color !== 'K')) result[y][x] = 'K';
    }
  }
  return result;
}

/** Shifts rows above `split` down by `by` pixels (a squash), keeping the feet. */
function squash(grid, by, split = 40) {
  const result = clone(grid);
  for (let y = split; y >= 0; y--)
    result[y] = y - by >= 0 ? [...grid[y - by]] : Array(SIZE).fill(null);
  return result;
}

/** Shifts rows above `split` sideways by `dx` pixels (a sway), keeping the feet. */
function sway(grid, dx, split = 40) {
  const result = clone(grid);
  for (let y = 0; y <= split; y++) {
    result[y] = Array.from({ length: SIZE }, (_, x) => grid[y][x - dx] ?? null);
  }
  return result;
}

/** Draws a 1px ink line (Bresenham). */
function line(grid, x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    set(grid, x0, y0, 'K');
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

/**
 * Losing footing: the body (rows above the legs) shifts by (bodyDx, bodyDy)
 * and the legs are redrawn as `legs`, a list of [x0, y0, x1, y1] strokes.
 * Redrawing the legs changes the silhouette, which a 48px sprite needs for
 * a pose to read at all.
 */
function stumble(grid, bodyDx, bodyDy, legs, legTop = 43) {
  const result = blank();
  for (let y = 0; y < legTop; y++) {
    const source = grid[y - bodyDy];
    if (source) result[y] = Array.from({ length: SIZE }, (_, x) => source[x - bodyDx] ?? null);
  }
  for (const [x0, y0, x1, y1] of legs) line(result, x0, y0, x1, y1);
  return result;
}

/** Moves the whole sprite up by `by` pixels. */
function lift(grid, by) {
  return grid.map((_, y) => (grid[y + by] ? [...grid[y + by]] : Array(SIZE).fill(null)));
}

function zGlyph(grid, x, y, size) {
  rect(grid, x, y, x + size - 1, y, 'L');
  for (let i = 1; i < size - 1; i++) set(grid, x + size - 1 - i, y + i, 'L');
  rect(grid, x, y + size - 1, x + size - 1, y + size - 1, 'L');
}

// --- the raven (facing left), modeled on the concept sketch ---

const EYE = { cx: 19, cy: 20, radius: 2.5 };

function drawRaven() {
  const g = blank();
  // tail, body, chest (checker dither) and head
  for (let y = 35; y <= 41; y++) rect(g, 34, y, 44 - (y - 35), y, 'D');
  ellipse(g, 26, 31, 13, 10, 'D');
  ellipse(g, 20, 32, 7, 6, (x, y) => ((x + y) % 2 === 0 ? 'M' : 'D'));
  ellipse(g, 24, 21, 10, 7, 'D');
  // wing: dark ring with dithered feathers
  ellipse(g, 33, 31, 7, 8, 'K');
  ellipse(g, 33, 31, 6, 7, (x, y) => (y > 30 && (x + y) % 3 === 0 ? 'M' : 'D'));
  // beak: light upper half, mid-gray lower half; tip at (5, 20)
  rect(g, 7, 19, 15, 19, 'L');
  rect(g, 5, 20, 15, 20, 'L');
  rect(g, 7, 21, 15, 21, 'M');
  // eye: white disc with an ink ring; the pupil is drawn by the app
  ellipse(g, EYE.cx, EYE.cy, EYE.radius + 1, EYE.radius + 1, 'K');
  ellipse(g, EYE.cx, EYE.cy, EYE.radius, EYE.radius, 'W');

  const raven = outline(g);
  // top hat with a red band, drawn after the outline (it is ink already)
  rect(raven, 18, 5, 29, 12, 'K');
  rect(raven, 18, 10, 29, 10, 'R');
  rect(raven, 18, 11, 29, 11, 'r');
  rect(raven, 14, 13, 33, 14, 'K');
  // legs and toes
  rect(raven, 22, 42, 22, 45, 'K');
  rect(raven, 27, 42, 27, 45, 'K');
  rect(raven, 21, 46, 23, 46, 'K');
  rect(raven, 26, 46, 28, 46, 'K');
  return raven;
}

/** Replaces the open eye with a lid; `half` keeps the lower white visible. */
function closeEye(grid, half) {
  const result = clone(grid);
  for (let y = EYE.cy - 2; y <= EYE.cy + 2; y++) {
    for (let x = EYE.cx - 2; x <= EYE.cx + 2; x++) {
      if (result[y][x] !== 'W') continue;
      if (y === EYE.cy) result[y][x] = 'K';
      else if (y < EYE.cy || !half) result[y][x] = 'D';
    }
  }
  return result;
}

/** Crosses out the eye: the classic cartoon "x" of a dizzy character. */
function dizzyEye(grid) {
  const result = clone(grid);
  for (const d of [-1, 0, 1]) {
    result[EYE.cy + d][EYE.cx + d] = 'K';
    result[EYE.cy - d][EYE.cx + d] = 'K';
  }
  return result;
}

// --- frames and anchors ---

const base = drawRaven();
// `dy` moves the body; `feetDy` moves the feet, which stay put when the
// body squashes and only rise when the whole bird leaves the ground.
const anchors = (dy, feetDy = 0) => ({
  eye: { x: 18, y: 19 + dy }, // top-left of the 2x2 pupil
  beak: { x: 5, y: 20 + dy },
  head: { x: 23, y: 5 + dy },
  feet: { x: 24, y: 46 + feetDy }, // between the two legs, on the toes
});
const closedAnchors = (dy, feetDy = 0) => {
  const { beak, head, feet } = anchors(dy, feetDy);
  return { beak, head, feet };
};

const sleepA = squash(closeEye(base, false), 1);
zGlyph(sleepA, 36, 5, 4);
const sleepB = squash(closeEye(base, false), 1);
zGlyph(sleepB, 36, 3, 4);
zGlyph(sleepB, 41, 0, 5);

const FRAMES = [
  base, // 0 idle: inhale
  squash(base, 1), // 1 idle: exhale
  closeEye(base, true), // 2 blink: half closed
  closeEye(base, false), // 3 blink: closed
  squash(base, 2), // 4 hop: crouch
  lift(base, 4), // 5 hop: airborne
  sleepA, // 6 sleep
  sleepB, // 7 sleep
  sway(dizzyEye(base), -1), // 8 dizzy: sway left
  sway(dizzyEye(base), 1), // 9 dizzy: sway right
  // 10 slip: feet shoot forward (Mocha faces left), body thrown back
  stumble(base, 2, 1, [
    [23, 43, 18, 46],
    [16, 46, 18, 46],
    [28, 43, 23, 46],
    [21, 46, 23, 46],
  ]),
  // 11 slip: one foot finds the floor, the other kicks in the air
  stumble(base, -1, 0, [
    [21, 43, 21, 46],
    [20, 46, 22, 46],
    [26, 43, 30, 44],
    [30, 44, 32, 44],
  ]),
  squash(closeEye(base, true), 1), // 12 tired: heavy lids, slumped
  squash(closeEye(base, true), 2), // 13 tired: slumped further on the breath out
  squash(closeEye(base, false), 2), // 14 tired: nodding off for a moment
];

/** Slip anchors: the body shifted by (dx, dy), the feet by feetDx. */
const slipAnchors = (dx, dy, feetDx) => {
  const { eye, beak, head, feet } = anchors(dy);
  const move = ({ x, y }) => ({ x: x + dx, y });
  return {
    eye: move(eye),
    beak: move(beak),
    head: move(head),
    feet: { x: feet.x + feetDx, y: feet.y },
  };
};

/** Dizzy anchors: crossed-out eye (no pupil), head swaying with the body. */
const dizzyAnchors = (dx) => {
  const { beak, head, feet } = anchors(0);
  return { beak: { x: beak.x + dx, y: beak.y }, head: { x: head.x + dx, y: head.y }, feet };
};

const manifest = {
  schemaVersion: 1,
  name: 'Mocha (placeholder)',
  image: 'sprite.png',
  frameSize: { width: SIZE, height: SIZE },
  animations: {
    idle: {
      loop: true,
      frames: [
        { index: 0, durationMs: 800, anchors: anchors(0) },
        { index: 1, durationMs: 800, anchors: anchors(1) },
      ],
    },
    blink: {
      loop: false,
      frames: [
        { index: 2, durationMs: 60, anchors: closedAnchors(0) },
        { index: 3, durationMs: 100, anchors: closedAnchors(0) },
        { index: 2, durationMs: 60, anchors: closedAnchors(0) },
      ],
    },
    hop: {
      loop: false,
      frames: [
        { index: 4, durationMs: 80, anchors: anchors(2) },
        { index: 5, durationMs: 220, anchors: anchors(-4, -4) },
        { index: 4, durationMs: 80, anchors: anchors(2) },
      ],
    },
    sleep: {
      loop: true,
      frames: [
        { index: 6, durationMs: 1200, anchors: closedAnchors(1) },
        { index: 7, durationMs: 1200, anchors: closedAnchors(1) },
      ],
    },
    // Low energy: heavy lids, slow breathing and a moment of nodding off.
    // The lids cover the pupil, so these frames have no eye anchor.
    tired: {
      loop: true,
      frames: [
        { index: 12, durationMs: 1400, anchors: closedAnchors(1) },
        { index: 13, durationMs: 1400, anchors: closedAnchors(2) },
        { index: 12, durationMs: 1400, anchors: closedAnchors(1) },
        { index: 14, durationMs: 600, anchors: closedAnchors(2) },
        { index: 13, durationMs: 1400, anchors: closedAnchors(2) },
      ],
    },
    // Feet slide out, Mocha wobbles twice and catches itself.
    slip: {
      loop: false,
      frames: [
        { index: 10, durationMs: 150, anchors: slipAnchors(2, 1, -4) },
        { index: 11, durationMs: 150, anchors: slipAnchors(-1, 0, -3) },
        { index: 10, durationMs: 120, anchors: slipAnchors(2, 1, -4) },
        { index: 11, durationMs: 120, anchors: slipAnchors(-1, 0, -3) },
        { index: 1, durationMs: 200, anchors: anchors(1) },
      ],
    },
    // Six sways left and right, then back to idle.
    dizzy: {
      loop: false,
      frames: Array.from({ length: 12 }, (_, i) => {
        const dx = i % 2 === 0 ? -1 : 1;
        return { index: i % 2 === 0 ? 8 : 9, durationMs: 150, anchors: dizzyAnchors(dx) };
      }),
    },
  },
};

// --- PNG encoding (RGBA, no dependencies) ---

function encodePng(frames) {
  const width = SIZE * frames.length;
  const rows = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [0]; // filter type: none
    for (const frame of frames) {
      for (let x = 0; x < SIZE; x++) {
        const color = frame[y][x];
        row.push(...(color ? [...PALETTE[color], 255] : [0, 0, 0, 0]));
      }
    }
    rows.push(Buffer.from(row));
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(SIZE, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'sprite.png'), encodePng(FRAMES));
writeFileSync(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`Wrote ${FRAMES.length} frames to ${OUT_DIR}\n`);
