// Renders Mocha's app icon with the app's own drawing code: the raven in the
// icon is exactly the one on the desktop. Pixel art is drawn on a coarse grid
// and scaled by a whole number, so its edges stay crisp; only the rounded
// macOS shape and its shadow are smooth. electron-builder turns the 1024px
// PNG into the macOS icon set.
//
// Run after changing the skin: pnpm --filter @mocha/desktop generate:icon
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { parseSkinManifest } from '@mocha/core';
import { skinAppearance } from '../src/renderer/appearance.ts';

const SKIN_DIR = join(import.meta.dirname, '../src/renderer/skins/default');
const OUT_FILE = join(import.meta.dirname, '../resources/icon.png');
const SIZE = 1024;
// The macOS icon grid: an 824px rounded square centered on a 1024px canvas.
const BODY = 824;
const BODY_OFFSET = (SIZE - BODY) / 2;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// --- reading the sprite sheet ---

/** Decodes an 8-bit RGBA, non-interlaced PNG. */
function decodePng(file) {
  const png = readFileSync(file);
  let width = 0;
  let height = 0;
  const data = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
    }
    if (type === 'IDAT') data.push(body);
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * 4;
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const value = raw[y * (stride + 1) + 1 + i];
      const left = i >= 4 ? pixels[y * stride + i - 4] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + i] : 0;
      const corner = y > 0 && i >= 4 ? pixels[(y - 1) * stride + i - 4] : 0;
      const estimate = left + up - corner;
      const distances = [left, up, corner].map((n) => Math.abs(estimate - n));
      const paeth = [left, up, corner][distances.indexOf(Math.min(...distances))];
      const predictor = [0, left, up, (left + up) >> 1, paeth][filter];
      pixels[y * stride + i] = value + predictor;
    }
  }
  return { width, height, data: pixels };
}

// --- a small pixel canvas with the calls the app's drawing code uses ---

const hex = (value) => {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
};

function parseColor(style) {
  if (style.startsWith('#')) return hex(style);
  const [r, g, b, a] = style.match(/[\d.]+/g).map(Number);
  return [r, g, b, Math.round(a * 255)];
}

function createGrid(width, height) {
  const pixels = new Uint8Array(width * height * 4);
  function blend(x, y, [r, g, b, a]) {
    if (x < 0 || y < 0 || x >= width || y >= height || a === 0) return;
    const at = (y * width + x) * 4;
    const under = pixels[at + 3];
    const alpha = a + (under * (255 - a)) / 255;
    const mix = (top, bottom) => (top * a + (bottom * under * (255 - a)) / 255) / alpha;
    pixels[at] = mix(r, pixels[at]);
    pixels[at + 1] = mix(g, pixels[at + 1]);
    pixels[at + 2] = mix(b, pixels[at + 2]);
    pixels[at + 3] = alpha;
  }
  return {
    width,
    height,
    pixels,
    blend,
    fillStyle: '#000000',
    fillRect(x, y, w, h) {
      const color = parseColor(this.fillStyle);
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) blend(x + dx, y + dy, color);
    },
    drawImage(image, sx, sy, w, h, dx, dy) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const at = ((sy + y) * image.width + sx + x) * 4;
          blend(dx + x, dy + y, [...image.data.subarray(at, at + 4)]);
        }
      }
    },
    /** Paints a bitmap given as strings; each character maps to a color. */
    stamp(rows, colors, left, top) {
      rows.forEach((row, y) => {
        [...row].forEach((key, x) => {
          if (colors[key]) blend(left + x, top + y, hex(colors[key]));
        });
      });
    },
    /** Copies another grid on top of this one. */
    paste(other, left, top) {
      for (let y = 0; y < other.height; y++) {
        for (let x = 0; x < other.width; x++) {
          const at = (y * other.width + x) * 4;
          blend(left + x, top + y, [...other.pixels.subarray(at, at + 4)]);
        }
      }
    },
  };
}

/** Mocha in its first idle frame, without the ground shadow, as a 48x48 grid. */
function drawMocha(skin) {
  const appearance = skinAppearance(skin);
  const frame = skin.manifest.animations.idle.frames[0];
  const grid = createGrid(48, 48);
  appearance.draw(grid, { frame, hovered: false, gaze: { x: 0, y: 0 } });
  // Remove the soft ground shadow: in an icon it reads as a smudge.
  for (let at = 0; at < grid.pixels.length; at += 4) {
    if (grid.pixels[at + 3] < 200) grid.pixels.fill(0, at, at + 4);
  }
  return grid;
}

const brightness = (pixels, at) => (pixels[at] + pixels[at + 1] + pixels[at + 2]) / 3;

/**
 * Pastes Mocha with a 1px rim of light around its dark pixels, but only where
 * it stands against something dark: against the moon, the black silhouette
 * needs no help, and an outline there would look like a sticker.
 */
function pasteWithRim(grid, mocha, left, top, color) {
  const { width, height, pixels } = mocha;
  const dark = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const at = (y * width + x) * 4;
    return pixels[at + 3] >= 128 && brightness(pixels, at) < 90;
  };
  for (let y = -1; y <= height; y++) {
    for (let x = -1; x <= width; x++) {
      const inside = x >= 0 && y >= 0 && x < width && y < height;
      if (inside && pixels[(y * width + x) * 4 + 3] >= 128) continue;
      if (!(dark(x - 1, y) || dark(x + 1, y) || dark(x, y - 1) || dark(x, y + 1))) continue;
      const gx = left + x;
      const gy = top + y;
      if (gx < 0 || gy < 0 || gx >= grid.width || gy >= grid.height) continue;
      const under = (gy * grid.width + gx) * 4;
      if (grid.pixels[under + 3] > 0 && brightness(grid.pixels, under) > 150) continue;
      grid.blend(gx, gy, hex(color));
    }
  }
  grid.paste(mocha, left, top);
}

/** The bounding box of the visible pixels. */
function bounds(grid) {
  let [left, top, right, bottom] = [grid.width, grid.height, -1, -1];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.pixels[(y * grid.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

// --- shapes ---

/** How far a point is into the macOS rounded square: < 1 inside, > 1 outside. */
function squircle(x, y, inset = 0) {
  const half = BODY / 2 - inset;
  const nx = Math.abs(x - SIZE / 2) / half;
  const ny = Math.abs(y - SIZE / 2) / half;
  return (nx ** 5 + ny ** 5) ** (1 / 5);
}

function filledCircle(grid, cx, cy, radius, color) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= radius ** 2) grid.blend(x, y, hex(color));
    }
  }
}

// --- the icon ---

const SKY = ['#2b2143', '#4d3a6e']; // top to bottom, lighter towards the horizon
const MOON = '#f6ecd6';
const MOON_SHADE = '#e6d6b6';
const GLOW = '#4a3b68';
const RIM = '#b9a2dc'; // moonlight on the edge of the feathers
/** Screen pixels per art pixel: the pixel art is drawn on a 78x78 grid. */
const SCALE = 13;

/** The pixel-art layer: a glowing moon right behind Mocha's head, and stars. */
function paintScene(grid, mocha) {
  // Mocha first, so the moon can sit right behind its head and hat: the
  // black silhouette is strongest against the brightest thing in the icon.
  const box = bounds(mocha);
  const center = Math.floor(grid.width / 2);
  const left = center - 2 - box.left - Math.floor(box.width / 2);
  const top = grid.height - 13 - box.bottom;
  const moonX = left + 27;
  const moonY = top + 17;
  const radius = 20;

  // A dithered glow around the moon: pixel-art light without gradients.
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const distance = Math.hypot(x + 0.5 - moonX, y + 0.5 - moonY);
      if (distance > radius && distance <= radius + 2.5 && (x + y) % 2 === 0) {
        grid.blend(x, y, hex(GLOW));
      }
    }
  }
  filledCircle(grid, moonX, moonY, radius, MOON);
  // Craters on the part of the moon that Mocha does not cover.
  filledCircle(grid, moonX + 12, moonY - 7, 2.6, MOON_SHADE);
  filledCircle(grid, moonX + 15, moonY + 3, 1.8, MOON_SHADE);

  const sparkle = ['..#..', '..#..', '##.##', '..#..', '..#..'];
  grid.stamp(sparkle, { '#': MOON }, center + 20, center + 9);
  for (const [x, y] of [
    [center - 25, center - 24],
    [center - 22, center + 4],
    [center + 23, center - 25],
  ]) {
    grid.stamp(['#'], { '#': RIM }, x, y);
  }

  pasteWithRim(grid, mocha, left, top, RIM);
}

function renderIcon(skin) {
  const cells = Math.floor(SIZE / SCALE);
  const origin = Math.floor((SIZE - cells * SCALE) / 2);
  const grid = createGrid(cells, cells);
  paintScene(grid, drawMocha(skin));

  const [topColor, bottomColor] = SKY.map(hex);
  const out = new Uint8Array(SIZE * SIZE * 4);
  const samples = 4;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Coverage of the rounded square, supersampled for a smooth edge.
      let covered = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          if (squircle(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples) <= 1) covered++;
        }
      }
      const coverage = covered / samples ** 2;

      // A soft shadow under the shape, as macOS icons have.
      const shade = squircle(x + 0.5, y + 0.5 - 10, -2);
      const shadowAlpha = 0.22 * Math.max(0, Math.min(1, (1.03 - shade) / 0.05)) ** 2;

      const t = Math.max(0, Math.min(1, (y - BODY_OFFSET) / BODY));
      let color = topColor.map((c, i) => c + (bottomColor[i] - c) * t);
      const gx = Math.floor((x - origin) / SCALE);
      const gy = Math.floor((y - origin) / SCALE);
      if (gx >= 0 && gy >= 0 && gx < cells && gy < cells) {
        const at = (gy * cells + gx) * 4;
        const a = grid.pixels[at + 3] / 255;
        color = color.map((c, i) => grid.pixels[at + i] * a + c * (1 - a));
      }

      // The shape over its shadow.
      const alpha = coverage + shadowAlpha * (1 - coverage);
      const at = (y * SIZE + x) * 4;
      for (let i = 0; i < 3; i++) out[at + i] = alpha > 0 ? (color[i] * coverage) / alpha : 0;
      out[at + 3] = Math.round(alpha * 255);
    }
  }
  return out;
}

// --- encoding ---

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels, width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rows.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- main ---

const parsed = parseSkinManifest(JSON.parse(readFileSync(join(SKIN_DIR, 'manifest.json'), 'utf8')));
if (!parsed.ok) throw new Error(`invalid skin: ${parsed.errors.join('; ')}`);
const skin = { manifest: parsed.value, image: decodePng(join(SKIN_DIR, parsed.value.image)) };

const out = process.argv[2] ?? OUT_FILE;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodePng(renderIcon(skin), SIZE, SIZE));
process.stdout.write(`${out}\n`);
