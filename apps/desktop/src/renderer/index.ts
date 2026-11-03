// Overlay renderer entry: draws Mocha on a transparent canvas.
import { createGameLoop, createPetAnimator } from '@mocha/core';
import { OVERLAY_SCALE, OVERLAY_SIZE, SPRITE_SIZE } from '../shared/overlay.ts';
import { type Appearance, placeholderAppearance, skinAppearance } from './appearance.ts';
import { createBrowserScheduler } from './browser-scheduler.ts';
import { isOpaqueAt, type Point } from './hit-test.ts';
import { loadImage } from './load-image.ts';
import { PLACEHOLDER_ANIMATIONS } from './placeholder-sprite.ts';
import { loadSkin } from './skin-loader.ts';
import defaultManifest from './skins/default/manifest.json';
import defaultSpriteUrl from './skins/default/sprite.png';

// Synchronous exceptions fire 'error'; rejected promises fire
// 'unhandledrejection'. Both are forwarded to the main-process log.
window.addEventListener('error', (event) => {
  window.mocha.reportError({ message: event.message, source: event.filename });
});
window.addEventListener('unhandledrejection', (event) => {
  const reason: unknown = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  window.mocha.reportError({ message: message || 'Unhandled promise rejection' });
});

const canvas = document.getElementById('mocha');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#mocha canvas is missing');

// The backing store stays at sprite resolution; CSS scales it to the window.
canvas.width = SPRITE_SIZE;
canvas.height = SPRITE_SIZE;
canvas.style.width = `${OVERLAY_SIZE}px`;
canvas.style.height = `${OVERLAY_SIZE}px`;

// willReadFrequently keeps the pixels in CPU memory for fast getImageData.
const context = canvas.getContext('2d', { willReadFrequently: true });
if (!context) throw new Error('2D canvas context is unavailable');

// The bundled skin's files, by the name the manifest uses. A manifest can
// only reference files listed here.
const defaultSkinFiles: Record<string, string> = { 'sprite.png': defaultSpriteUrl };

const skin = await loadSkin(
  defaultManifest,
  (fileName) => {
    const url = defaultSkinFiles[fileName];
    return url ? loadImage(url) : Promise.reject(new Error('not part of the skin'));
  },
  { width: SPRITE_SIZE, height: SPRITE_SIZE },
);

// Graceful degradation: a broken skin is reported, and Mocha stays on
// screen as the built-in placeholder instead of disappearing.
let appearance: Appearance<HTMLImageElement>;
let animations = PLACEHOLDER_ANIMATIONS;
if (skin.ok) {
  appearance = skinAppearance(skin.skin);
  animations = skin.skin.manifest.animations;
} else {
  const message = `Default skin is invalid, using the placeholder: ${skin.errors.join('; ')}`;
  window.mocha.reportError({ message: message.slice(0, 2_000) });
  appearance = placeholderAppearance();
}

// Clicks pass through the window except where Mocha is drawn. The main
// process is told only when the state changes, not on every mouse move.
let interactive = false;
let pointer: Point | undefined;
let pixels = context.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE);

function setInteractive(next: boolean): void {
  if (next === interactive) return;
  interactive = next;
  window.mocha.setOverlayInteractive(next);
  // Input path: show the hover state on the next frame, not the next step.
  loop.invalidate();
}

function refreshHitTest(): void {
  setInteractive(pointer !== undefined && isOpaqueAt(pixels, pointer, OVERLAY_SCALE));
}

// Picks the frame to show: idle, with a blink now and then.
const animator = createPetAnimator(animations, { random: Math.random });

const loop = createGameLoop({
  // 50 ms steps: frames of 50 ms or more are always shown at least once,
  // while the loop still sleeps between steps.
  stepMs: 50,
  scheduler: createBrowserScheduler(),
  update: (stepMs) => animator.update(stepMs),
  render() {
    context.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    appearance.draw(context, { frame: animator.frame, hovered: interactive });
    // Read the pixels once per drawing, not on every mouse move.
    pixels = context.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    // Mocha may have moved under a still cursor.
    refreshHitTest();
  },
});

window.addEventListener('mousemove', (event) => {
  pointer = { x: event.clientX, y: event.clientY };
  refreshHitTest();
});
document.addEventListener('mouseleave', () => {
  pointer = undefined;
  refreshHitTest();
});

// Do no work at all while the window is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) loop.stop();
  else loop.start();
});

loop.start();
