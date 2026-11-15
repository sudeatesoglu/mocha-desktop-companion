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

/** How far `shear` moves row `y`: `dx` at `top`, nothing at `pivot` and below. */
const shearShift = (dx, y, pivot, top) =>
  y >= pivot ? 0 : Math.round((dx * (pivot - y)) / (pivot - top));

/**
 * Leans everything above `pivot` sideways, more the higher it is: a bend
 * from the feet (pivot 40) or a tilt of the head (pivot at the neck).
 */
function shear(grid, dx, pivot, top) {
  return grid.map((row, y) => {
    const shift = shearShift(dx, y, pivot, top);
    return Array.from({ length: SIZE }, (_, x) => row[x - shift] ?? null);
  });
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

/**
 * An open beak for a yawn: two mandibles that spread apart from the hinge
 * towards their tips by `slope` pixels per pixel, with air between them and
 * the mouth showing only near the hinge.
 */
function openBeak(grid, dy, slope) {
  for (let x = 6; x <= 15; x++) {
    const spread = Math.round((15 - x) * slope);
    const top = 19 + dy - spread;
    const bottom = 21 + dy + spread;
    set(grid, x, top, 'L');
    if (x > 7) set(grid, x, top + 1, 'L'); // the upper mandible thins to a point
    if (x >= 7) set(grid, x, bottom, 'M');
    if (x >= 12) for (let y = top + 2; y < bottom; y++) set(grid, x, y, 'r');
  }
}

/**
 * The raven. The defaults draw the normal pose; other poses lower or raise
 * the head (`headDrop`, negative is up), slide the hat down over the eye
 * (`hatSlip`, tilted forward), open the beak for a yawn (`yawn`, the slope
 * of the open beak), puff the chest out on a breath in (`chest`) and move
 * the wing (`wing`: 1 halfway up, 2 above the head, 'hold' reaching
 * forward to hold something in front of the chest), which `wingShift`
 * moves by [dx, dy] for a roll.
 */
function drawRaven({
  headDrop = 0,
  hatSlip = 0,
  yawn = 0,
  chest = 0,
  wing = 0,
  wingShift = [0, 0],
} = {}) {
  const [wx, wy] = wingShift;
  const g = blank();
  const feathers = (x, y) => (y > 30 && (x + y) % 3 === 0 ? 'M' : 'D');
  // tail, body, chest (checker dither) and head
  for (let y = 35; y <= 41; y++) rect(g, 34, y, 44 - (y - 35), y, 'D');
  ellipse(g, 26, 31, 13, 10, 'D');
  ellipse(g, 20, 32 - chest, 7 + chest, 6 + chest, (x, y) => ((x + y) % 2 === 0 ? 'M' : 'D'));
  // A wing raised above the head sits behind it.
  if (wing === 2) {
    ellipse(g, 35, 17, 5, 10, 'K');
    ellipse(g, 35, 17, 4, 9, (x, y) => ((x + y) % 3 === 0 && y < 20 ? 'M' : 'D'));
  }
  ellipse(g, 24, 21 + headDrop, 10, 7, 'D');
  // wing: dark ring with dithered feathers
  if (wing === 0) {
    ellipse(g, 33 + wx, 31 + wy, 7, 8, 'K');
    ellipse(g, 33 + wx, 31 + wy, 6, 7, feathers);
  } else if (wing === 'hold') {
    ellipse(g, 21 + wx, 31 + wy, 7, 3.5, 'K');
    ellipse(g, 21 + wx, 31 + wy, 6, 2.5, feathers);
  } else if (wing === 1) {
    ellipse(g, 34, 25, 6, 8, 'K');
    ellipse(g, 34, 25, 5, 7, (x, y) => ((x + y) % 3 === 0 && y < 26 ? 'M' : 'D'));
  }
  // beak: light upper half, mid-gray lower half; tip at (5, 20)
  if (yawn > 0) {
    openBeak(g, headDrop, yawn);
  } else {
    rect(g, 7, 19 + headDrop, 15, 19 + headDrop, 'L');
    rect(g, 5, 20 + headDrop, 15, 20 + headDrop, 'L');
    rect(g, 7, 21 + headDrop, 15, 21 + headDrop, 'M');
  }
  // eye: white disc with an ink ring; the pupil is drawn by the app
  ellipse(g, EYE.cx, EYE.cy + headDrop, EYE.radius + 1, EYE.radius + 1, 'K');
  ellipse(g, EYE.cx, EYE.cy + headDrop, EYE.radius, EYE.radius, 'W');

  const raven = outline(g);
  // top hat with a red band, drawn after the outline (it is ink already).
  // A slipped hat sits lower and leans forward: each step of slip moves the
  // crown one more pixel towards the beak at the top.
  const hatY = headDrop + hatSlip;
  for (let y = 5; y <= 12; y++) {
    const lean = hatSlip > 0 ? -Math.floor((12 - y) / 4) - (hatSlip > 2 ? 1 : 0) : 0;
    const color = y === 10 ? 'R' : y === 11 ? 'r' : 'K';
    rect(raven, 18 + lean, y + hatY, 29 + lean, y + hatY, color);
  }
  if (hatSlip > 0) {
    // The brim tips forward: its front half sits one pixel lower.
    rect(raven, 14, 14 + hatY, 23, 15 + hatY, 'K');
    rect(raven, 24, 13 + hatY, 33, 14 + hatY, 'K');
  } else {
    rect(raven, 14, 13 + hatY, 33, 14 + hatY, 'K');
  }
  // legs and toes
  rect(raven, 22, 42, 22, 45, 'K');
  rect(raven, 27, 42, 27, 45, 'K');
  rect(raven, 21, 46, 23, 46, 'K');
  rect(raven, 26, 46, 28, 46, 'K');
  return raven;
}

/** Replaces the open eye with a lid; `half` keeps the lower white visible. */
function closeEye(grid, half, dy = 0) {
  const result = clone(grid);
  const cy = EYE.cy + dy;
  for (let y = cy - 2; y <= cy + 2; y++) {
    for (let x = EYE.cx - 2; x <= EYE.cx + 2; x++) {
      if (result[y][x] !== 'W') continue;
      if (y === cy) result[y][x] = 'K';
      else if (y < cy || !half) result[y][x] = 'D';
    }
  }
  return result;
}

/** A heavy lid over most of the eye and a pale bag under it. */
function heavyEye(grid, dy) {
  const result = clone(grid);
  const cy = EYE.cy + dy;
  for (let y = cy - 2; y <= cy + 2; y++) {
    for (let x = EYE.cx - 2; x <= EYE.cx + 2; x++) {
      if (result[y][x] !== 'W') continue;
      if (y === cy + 1) result[y][x] = 'K';
      else if (y < cy + 1) result[y][x] = 'D';
    }
  }
  rect(result, EYE.cx - 2, cy + 4, EYE.cx + 2, cy + 4, 'M');
  return result;
}

/** Eyes squeezed shut in a yawn: an arched ink line on the lid. */
function squeezedEye(grid, dy) {
  const result = closeEye(grid, false, dy);
  const cy = EYE.cy + dy;
  for (let x = EYE.cx - 2; x <= EYE.cx + 2; x++) result[cy][x] = 'D';
  set(result, EYE.cx - 2, cy + 1, 'K');
  set(result, EYE.cx - 1, cy, 'K');
  set(result, EYE.cx, cy, 'K');
  set(result, EYE.cx + 1, cy, 'K');
  set(result, EYE.cx + 2, cy + 1, 'K');
  return result;
}

/** A pupil drawn into the sprite, for poses that look somewhere fixed. */
function pupilAt(grid, dx, dy, headDrop) {
  const result = clone(grid);
  rect(result, 18 + dx, 19 + headDrop + dy, 19 + dx, 20 + headDrop + dy, 'K');
  return result;
}

/** Paints a small picture given as rows of palette keys ('.' is transparent). */
function stamp(grid, x, y, rows) {
  rows.forEach((row, dy) => {
    [...row].forEach((key, dx) => {
      if (key !== '.') set(grid, x + dx, y + dy, key);
    });
  });
}

// Air leaving the beak: light lines fanning out a pixel apart from the tip,
// so they never read as smoke from it. The tip is on the middle line's row
// (the fifth here, the sixth in the far one), which moves on and spreads as
// the breath ends.
const BREATH_NEAR = ['.LL.', '...L', '....', '..LL', 'LL..', '...L', '.LL.'];
const BREATH_FAR = ['LL..', '..L.', '....', '....', '.LL.', 'L...', '....', '..L.', 'LL..'];

/** Breath in front of a beak whose tip is on row `tipY`. */
function breathLines(grid, tipY, far) {
  const result = clone(grid);
  if (far) stamp(result, 0, tipY - 5, BREATH_FAR);
  else stamp(result, 0, tipY - 4, BREATH_NEAR);
  return result;
}

// An open book: two pages of text dipping to the spine, on a red cover.
const BOOK = [
  '.KKKKK.....KKKKK.',
  'KWWWWWKK.KKWWWWWK',
  'KWWWWWWWKWWWWWWWK',
  'KWLLLLLWKWLLLLLWK',
  'KWWWWWWWKWWWWWWWK',
  'KWLLLLWWKWLLLLLWK',
  'KWWWWWWWKWWWWWWWK',
  'KWLLLLLWKWLLLWWWK',
  'KWWWWWWWKWWWWWWWK',
  'KRKKKKKKKKKKKKKRK',
  '.KRRRRRRrRRRRRRK.',
  '..KKKKKKKKKKKKK..',
];
// A page halfway over, standing up from the spine, and the blank page it
// leaves behind.
const TURNING_PAGE = ['.KK.', 'KWWK', 'KWWK', 'KWK.'];
const BLANK_PAGE = Array(5).fill('WWWWWWW');

/** The open book in front of the chest; `turning` lifts a page from the spine. */
function book(grid, turning) {
  const result = clone(grid);
  stamp(result, 0, 26, BOOK);
  if (turning) {
    stamp(result, 7, 24, TURNING_PAGE);
    stamp(result, 9, 28, BLANK_PAGE);
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

// Tired: the silhouette changes, not just the eye, so it reads at 48px.
const slumped = heavyEye(drawRaven({ headDrop: 2, hatSlip: 2 }), 2);
const nodding = closeEye(drawRaven({ headDrop: 4, hatSlip: 3 }), false, 4);
zGlyph(nodding, 37, 8, 4);
const yawnStart = squeezedEye(drawRaven({ headDrop: 1, hatSlip: 2, yawn: 0.25 }), 1);
const yawnWide = squeezedEye(drawRaven({ headDrop: 0, hatSlip: 2, yawn: 0.5 }), 0);

// Rituals and focus. Each pose changes the silhouette: the chest and head
// for breathing, a raised head for looking far, a raised wing for
// stretching and a book held in the wing for reading.
const breatheHalfIn = closeEye(drawRaven({ headDrop: -1, chest: 1 }), false, -1);
const breatheIn = closeEye(drawRaven({ headDrop: -2, chest: 2 }), false, -2);
const breatheOutStart = breathLines(closeEye(base, false), 20, false);
const breatheOutHold = squash(closeEye(drawRaven({ headDrop: 1 }), false, 1), 1);
const breatheOutEnd = breathLines(breatheOutHold, 22, true);
const lookFarA = pupilAt(drawRaven({ headDrop: -1 }), -1, -1, -1);
const lookFarB = sway(pupilAt(drawRaven({ headDrop: -1 }), -1, 0, -1), -1);
const reading = drawRaven({ headDrop: 1, wing: 'hold' });

// Stretching: one pose per step, so Mocha does what the bubble asks.
// Rolling the shoulders: the wing goes up (the head sinks), back and down.
const shrug = drawRaven({ headDrop: 1, wingShift: [0, -3] });
const shoulderBack = drawRaven({ wingShift: [2, -2] });
const shoulderDown = drawRaven({ wingShift: [2, 0] });
// Reaching up: the wing above the head, the body rising on longer legs.
const wingUp = squeezedEye(drawRaven({ headDrop: -1, wing: 2 }), -1);
const LONG_LEGS = [
  [22, 43, 22, 45],
  [27, 43, 27, 45],
  [21, 46, 23, 46],
  [26, 46, 28, 46],
];
const reachHalf = stumble(wingUp, 0, -1, LONG_LEGS);
const reachHigh = stumble(wingUp, 0, -2, LONG_LEGS);
// Leaning: the wing up, the body bending from the feet.
const LEAN = { pivot: 40, top: 5 };
const lean = (dx) => shear(wingUp, dx, LEAN.pivot, LEAN.top);
// Tilting the head: eyes closed, the head bending from the neck.
const TILT = { pivot: 27, top: 4 };
const tilt = (dx) => shear(closeEye(base, false), dx, TILT.pivot, TILT.top);
// Rolling the wrists: the wing held forward, its tip going round.
const wristRoll = [
  [0, 0],
  [-1, -1],
  [0, -2],
  [1, -1],
].map((shift) => drawRaven({ wing: 'hold', wingShift: shift }));

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
  slumped, // 12 tired: head sunk, hat slipping, heavy lid
  squash(slumped, 1), // 13 tired: slumped further on the breath out
  nodding, // 14 tired: head drops, eye shut, a small "z"
  yawnStart, // 15 tired: a yawn begins
  yawnWide, // 16 tired: the yawn at its widest
  breatheHalfIn, // 17 breathe: filling up, eyes closed
  breatheIn, // 18 breathe: chest out, head up
  breatheOutStart, // 19 breathe: air leaving the beak
  breatheOutEnd, // 20 breathe: the last of it, the body sinking
  breatheOutHold, // 21 breathe: head down, emptied
  lookFarA, // 22 lookFar: head up, eye on the horizon
  lookFarB, // 23 lookFar: leaning forward to see further
  book(pupilAt(reading, -1, 1, 1), false), // 24 focus: reading the left page
  book(pupilAt(reading, 1, 1, 1), false), // 25 focus: reading the right page
  book(pupilAt(reading, 0, 0, 1), true), // 26 focus: turning the page
  shrug, // 27 shoulderRoll: shoulders up
  shoulderBack, // 28 shoulderRoll: and back
  shoulderDown, // 29 shoulderRoll: and down
  reachHalf, // 30 reachUp: rising
  reachHigh, // 31 reachUp: as high as it goes
  lean(-3), // 32 leanLeft: on the way
  lean(-6), // 33 leanLeft: all the way
  lean(3), // 34 leanRight: on the way
  lean(6), // 35 leanRight: all the way
  tilt(-3), // 36 tiltLeft: on the way
  tilt(-5), // 37 tiltLeft: all the way
  tilt(3), // 38 tiltRight: on the way
  tilt(5), // 39 tiltRight: all the way
  ...wristRoll, // 40-43 flutter: the wing tip going round
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

/** Anchors of a sheared frame: the beak and head move with their rows. */
const shearedAnchors = (dx, { pivot, top }, dy) => {
  const { beak, head, feet } = closedAnchors(dy);
  const move = ({ x, y }) => ({ x: x + shearShift(dx, y, pivot, top), y });
  return { beak: move(beak), head: move(head), feet };
};

/** A pose that eases into `full` through `half`, holds, and eases out: `ms` in all. */
const easeAndHold = (half, full, ms, ease = 1000) => [
  { ...half, durationMs: ease },
  { ...full, durationMs: ms - 2 * ease },
  { ...half, durationMs: ease },
];

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
    // Low energy: slumped and breathing slowly, Mocha nods off, jerks
    // awake with its eye wide open, then gives a big yawn. The lids cover
    // the pupil, so only the jerk awake (frame 0) has an eye anchor.
    tired: {
      loop: true,
      frames: [
        { index: 12, durationMs: 1300, anchors: closedAnchors(2) },
        { index: 13, durationMs: 1300, anchors: closedAnchors(3) },
        { index: 12, durationMs: 1300, anchors: closedAnchors(2) },
        { index: 13, durationMs: 1300, anchors: closedAnchors(3) },
        { index: 14, durationMs: 1600, anchors: closedAnchors(4) },
        { index: 0, durationMs: 250, anchors: anchors(0) },
        { index: 12, durationMs: 1300, anchors: closedAnchors(2) },
        { index: 13, durationMs: 1300, anchors: closedAnchors(3) },
        { index: 15, durationMs: 250, anchors: closedAnchors(1) },
        { index: 16, durationMs: 1100, anchors: closedAnchors(0) },
        { index: 15, durationMs: 250, anchors: closedAnchors(1) },
      ],
    },
    // Box breathing in step with the breathe ritual: in for 3 s, filling up
    // step by step, and hold 3 s; out for 3 s, the air leaving and the body
    // sinking, and hold 3 s. The eyes are closed: no eye anchor.
    breathe: {
      loop: true,
      frames: [
        { index: 3, durationMs: 750, anchors: closedAnchors(0) },
        { index: 17, durationMs: 750, anchors: closedAnchors(-1) },
        { index: 18, durationMs: 4500, anchors: closedAnchors(-2) },
        { index: 19, durationMs: 1500, anchors: closedAnchors(0) },
        { index: 20, durationMs: 1500, anchors: closedAnchors(2) },
        { index: 21, durationMs: 3000, anchors: closedAnchors(2) },
      ],
    },
    // Gazing into the distance. The pupil is drawn in the sprite, fixed on
    // the horizon instead of following the cursor, so no eye anchor.
    lookFar: {
      loop: true,
      frames: [
        { index: 22, durationMs: 2400, anchors: closedAnchors(-1) },
        { index: 23, durationMs: 2400, anchors: closedAnchors(-1) },
      ],
    },
    // The end of the eye rest: slow, deliberate blinks.
    slowBlink: {
      loop: true,
      frames: [
        { index: 0, durationMs: 900, anchors: anchors(0) },
        { index: 2, durationMs: 250, anchors: closedAnchors(0) },
        { index: 3, durationMs: 900, anchors: closedAnchors(0) },
        { index: 2, durationMs: 250, anchors: closedAnchors(0) },
      ],
    },
    // The stretching ritual, one animation per step. Each one that holds a
    // position eases in and out within its step's 8 seconds.
    shoulderRoll: {
      loop: true,
      frames: [
        { index: 27, durationMs: 600, anchors: anchors(1) },
        { index: 28, durationMs: 600, anchors: anchors(0) },
        { index: 29, durationMs: 600, anchors: anchors(0) },
        { index: 0, durationMs: 700, anchors: anchors(0) },
      ],
    },
    reachUp: {
      loop: true,
      frames: [
        { index: 30, durationMs: 1200, anchors: closedAnchors(-2) },
        { index: 31, durationMs: 2600, anchors: closedAnchors(-3) },
      ],
    },
    leanLeft: {
      loop: true,
      frames: easeAndHold(
        { index: 32, anchors: shearedAnchors(-3, LEAN, -1) },
        { index: 33, anchors: shearedAnchors(-6, LEAN, -1) },
        8000,
      ),
    },
    leanRight: {
      loop: true,
      frames: easeAndHold(
        { index: 34, anchors: shearedAnchors(3, LEAN, -1) },
        { index: 35, anchors: shearedAnchors(6, LEAN, -1) },
        8000,
      ),
    },
    tiltLeft: {
      loop: true,
      frames: easeAndHold(
        { index: 36, anchors: shearedAnchors(-3, TILT, 0) },
        { index: 37, anchors: shearedAnchors(-5, TILT, 0) },
        8000,
      ),
    },
    tiltRight: {
      loop: true,
      frames: easeAndHold(
        { index: 38, anchors: shearedAnchors(3, TILT, 0) },
        { index: 39, anchors: shearedAnchors(5, TILT, 0) },
        8000,
      ),
    },
    flutter: {
      loop: true,
      frames: [40, 41, 42, 43].map((index) => ({ index, durationMs: 250, anchors: anchors(0) })),
    },
    // Reading next to the user during a focus session: the eye moves along
    // the lines, and now and then a page turns.
    focus: {
      loop: true,
      frames: [
        { index: 24, durationMs: 2200, anchors: closedAnchors(1) },
        { index: 25, durationMs: 1800, anchors: closedAnchors(1) },
        { index: 24, durationMs: 2200, anchors: closedAnchors(1) },
        { index: 25, durationMs: 1500, anchors: closedAnchors(1) },
        { index: 26, durationMs: 400, anchors: closedAnchors(1) },
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
