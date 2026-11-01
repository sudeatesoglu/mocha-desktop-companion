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

// --- frames and anchors ---

const base = drawRaven();
const anchors = (dy) => ({
  eye: { x: 18, y: 19 + dy }, // top-left of the 2x2 pupil
  beak: { x: 5, y: 20 + dy },
  head: { x: 23, y: 5 + dy },
});
const closedAnchors = (dy) => {
  const { beak, head } = anchors(dy);
  return { beak, head };
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
];

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
    look: { loop: true, frames: [{ index: 0, durationMs: 1000, anchors: anchors(0) }] },
    hop: {
      loop: false,
      frames: [
        { index: 4, durationMs: 80, anchors: anchors(2) },
        { index: 5, durationMs: 220, anchors: anchors(-4) },
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
