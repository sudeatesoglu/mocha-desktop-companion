// Renders the README's animated images with the app's own animator, appearance
// and effects, so they always show what the app really draws. Output is APNG:
// unlike GIF it has partial transparency, which the ground shadow needs.
//
// Run after changing the skin: pnpm --filter @mocha/desktop generate:readme-art
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { createPetAnimator, gazeOffset, parseSkinManifest } from '@mocha/core';
import { skinAppearance } from '../src/renderer/appearance.ts';
import { createEffects } from '../src/renderer/effects.ts';

const SKIN_DIR = join(import.meta.dirname, '../src/renderer/skins/default');
const OUT_DIR = join(import.meta.dirname, '../../../docs/assets/readme');
const SIZE = 48;
const STEP_MS = 50; // the same step as the app's game loop
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
      if (body[8] !== 8 || body[9] !== 6 || body[12] !== 0) {
        throw new Error('the sprite sheet must be an 8-bit RGBA, non-interlaced PNG');
      }
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

// --- a software canvas with the calls the app's drawing code uses ---

function parseColor(style) {
  if (style.startsWith('#')) {
    const n = Number.parseInt(style.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  const [r, g, b, a] = style.match(/[\d.]+/g).map(Number);
  return [r, g, b, Math.round(a * 255)];
}

function createCanvas() {
  const pixels = new Uint8Array(SIZE * SIZE * 4);

  function blend(x, y, [r, g, b, a]) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || a === 0) return;
    const at = (y * SIZE + x) * 4;
    const under = pixels[at + 3];
    const alpha = a + (under * (255 - a)) / 255;
    const mix = (top, bottom) => (top * a + (bottom * under * (255 - a)) / 255) / alpha;
    pixels[at] = mix(r, pixels[at]);
    pixels[at + 1] = mix(g, pixels[at + 1]);
    pixels[at + 2] = mix(b, pixels[at + 2]);
    pixels[at + 3] = alpha;
  }

  return {
    pixels,
    fillStyle: '#000000',
    fillRect(x, y, width, height) {
      const color = parseColor(this.fillStyle);
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) blend(x + dx, y + dy, color);
      }
    },
    drawImage(image, sx, sy, width, height, dx, dy) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const at = ((sy + y) * image.width + sx + x) * 4;
          blend(dx + x, dy + y, [...image.data.subarray(at, at + 4)]);
        }
      }
    },
  };
}

/**
 * Adds a 1px paper-white outline around dark pixels, so the black raven reads
 * on dark pages. Bright effects (z's, stars, the heart) need no outline, and
 * it would turn small ones into blobs.
 */
function withHalo(pixels) {
  const result = pixels.slice();
  const solid = (x, y) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return false;
    const at = (y * SIZE + x) * 4;
    const brightness = (pixels[at] + pixels[at + 1] + pixels[at + 2]) / 3;
    return pixels[at + 3] >= 128 && brightness < 60;
  };
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const at = (y * SIZE + x) * 4;
      if (pixels[at + 3] >= 128) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        result.set([0xf2, 0xee, 0xe6, 255], at);
      }
    }
  }
  return result;
}

// --- encoding ---

function scaled(pixels, scale) {
  const size = SIZE * scale;
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const start = y * (size * 4 + 1);
    for (let x = 0; x < size; x++) {
      const from = (Math.floor(y / scale) * SIZE + Math.floor(x / scale)) * 4;
      rows.set(pixels.subarray(from, from + 4), start + 1 + x * 4);
    }
  }
  return deflateSync(rows, { level: 9 });
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Encodes frames ({ pixels, ms }) as a looping APNG. */
function encodeApng(frames, scale) {
  const size = SIZE * scale;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const animation = Buffer.alloc(8);
  animation.writeUInt32BE(frames.length, 0); // the second field, 0, loops forever

  let sequence = 0;
  const parts = [PNG_SIGNATURE, chunk('IHDR', header), chunk('acTL', animation)];
  frames.forEach(({ pixels, ms }, index) => {
    const control = Buffer.alloc(26);
    control.writeUInt32BE(sequence++, 0);
    control.writeUInt32BE(size, 4);
    control.writeUInt32BE(size, 8);
    control.writeUInt16BE(ms, 20);
    control.writeUInt16BE(1000, 22); // the delay is in milliseconds
    control[24] = 1; // clear before the next frame, or transparency piles up
    parts.push(chunk('fcTL', control));
    const data = scaled(pixels, scale);
    if (index === 0) {
      parts.push(chunk('IDAT', data));
    } else {
      const number = Buffer.alloc(4);
      number.writeUInt32BE(sequence++);
      parts.push(chunk('fdAT', Buffer.concat([number, data])));
    }
  });
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

// --- scenes ---

/** A seeded generator, so repeated runs produce identical files. */
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Steps the app's own code for `durationMs`, merging identical frames. */
function renderScene(skin, { durationMs, start, gazeAt, seed = 1 }) {
  const appearance = skinAppearance(skin);
  const animator = createPetAnimator(skin.manifest.animations, { random: seededRandom(seed) });
  const effects = createEffects();
  start?.(animator, effects);

  const frames = [];
  for (let t = 0; t < durationMs; t += STEP_MS) {
    const canvas = createCanvas();
    const eye = appearance.eyeCenter(animator.frame);
    const gaze = gazeAt && eye ? gazeOffset(eye, gazeAt(t)) : { x: 0, y: 0 };
    appearance.draw(canvas, { frame: animator.frame, hovered: false, gaze });
    effects.draw(canvas, {
      head: appearance.head(animator.frame),
      feet: appearance.feet(animator.frame),
    });

    const last = frames.at(-1);
    if (last && Buffer.compare(last.pixels, canvas.pixels) === 0) {
      last.ms += STEP_MS;
    } else {
      frames.push({ pixels: canvas.pixels, ms: STEP_MS });
    }
    animator.update(STEP_MS);
    effects.update(STEP_MS);
  }
  return frames;
}

const SCENES = {
  hero: { scale: 5, durationMs: 9_000, seed: 7 },
  pet: {
    scale: 3,
    durationMs: 2_400,
    start: (animator, effects) => {
      animator.play('hop');
      effects.add('heart');
    },
  },
  dizzy: {
    scale: 3,
    durationMs: 2_400,
    start: (animator, effects) => {
      animator.play('dizzy');
      effects.add('stars');
    },
  },
  watch: {
    scale: 3,
    durationMs: 3_200,
    // The cursor circles Mocha, so the pupil looks all the way around.
    gazeAt: (t) => {
      const angle = (t / 3_200) * 2 * Math.PI;
      return { x: 24 + 30 * Math.cos(angle), y: 20 + 30 * Math.sin(angle) };
    },
  },
  sleep: { scale: 3, durationMs: 2_400, start: (animator) => animator.play('sleep') },
};

// --- main ---

const parsed = parseSkinManifest(JSON.parse(readFileSync(join(SKIN_DIR, 'manifest.json'), 'utf8')));
if (!parsed.ok) throw new Error(`invalid skin: ${parsed.errors.join('; ')}`);
const skin = { manifest: parsed.value, image: decodePng(join(SKIN_DIR, parsed.value.image)) };

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, scene] of Object.entries(SCENES)) {
  const frames = renderScene(skin, scene);
  const dark = frames.map(({ pixels, ms }) => ({ pixels: withHalo(pixels), ms }));
  writeFileSync(join(OUT_DIR, `${name}-light.png`), encodeApng(frames, scene.scale));
  writeFileSync(join(OUT_DIR, `${name}-dark.png`), encodeApng(dark, scene.scale));
  process.stdout.write(`${name}: ${frames.length} frames\n`);
}
