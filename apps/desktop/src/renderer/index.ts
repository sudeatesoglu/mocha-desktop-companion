// Overlay renderer entry: draws Mocha on a transparent canvas.
import { OVERLAY_SIZE, SPRITE_SIZE } from '../shared/overlay.ts';
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

const context = canvas.getContext('2d');
if (!context) throw new Error('2D canvas context is unavailable');

drawPlaceholderMocha(context);
