// Overlay renderer entry: draws Mocha on a transparent canvas.
import { OVERLAY_SCALE, OVERLAY_SIZE, SPRITE_SIZE } from '../shared/overlay.ts';
import { isOpaqueAt } from './hit-test.ts';
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

drawPlaceholderMocha(context);
// Read the pixels once per drawing, not on every mouse move.
const pixels = context.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE);

// Clicks pass through the window except where Mocha is drawn. The main
// process is told only when the state changes, not on every mouse move.
let interactive = false;
function setInteractive(next: boolean): void {
  if (next === interactive) return;
  interactive = next;
  document.body.classList.toggle('interactive', next);
  window.mocha.setOverlayInteractive(next);
}

window.addEventListener('mousemove', (event) => {
  setInteractive(isOpaqueAt(pixels, { x: event.clientX, y: event.clientY }, OVERLAY_SCALE));
});
document.addEventListener('mouseleave', () => setInteractive(false));
