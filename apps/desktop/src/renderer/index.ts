// Overlay renderer entry: draws Mocha on a transparent canvas.
import { createGameLoop } from '@mocha/core';
import { OVERLAY_SCALE, OVERLAY_SIZE, SPRITE_SIZE } from '../shared/overlay.ts';
import { breathOffset } from './breathing.ts';
import { createBrowserScheduler } from './browser-scheduler.ts';
import { isOpaqueAt, type Point } from './hit-test.ts';
import { drawPlaceholderMocha } from './placeholder-sprite.ts';

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

// Game state for now: just the placeholder's breathing pose.
let elapsedMs = 0;
let offsetY = breathOffset(0);

const loop = createGameLoop({
  stepMs: 100,
  scheduler: createBrowserScheduler(),
  update(stepMs) {
    elapsedMs += stepMs;
    const next = breathOffset(elapsedMs);
    if (next === offsetY) return false;
    offsetY = next;
    return true;
  },
  render() {
    context.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    drawPlaceholderMocha(context, { offsetY, hovered: interactive });
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
