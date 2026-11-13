// Overlay renderer entry: draws Mocha on a transparent canvas.
import {
  createGameLoop,
  createPetAnimator,
  createReactionDetector,
  type Gaze,
  gazeOffset,
  type Reaction,
} from '@mocha/core';
import { OVERLAY_SCALE, OVERLAY_SIZE, SPRITE_SIZE } from '../shared/overlay.ts';
import { createBrowserScheduler } from './browser-scheduler.ts';
import { loadDefaultLook } from './default-skin.ts';
import { createEffects } from './effects.ts';
import { isOpaqueAt, type Point } from './hit-test.ts';
import { loadImage } from './load-image.ts';
import { createPressGesture } from './press-gesture.ts';

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

// A broken skin is reported, and Mocha appears as the placeholder.
const { appearance, animations } = await loadDefaultLook(loadImage, (message) =>
  window.mocha.reportError({ message }),
);

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

// Click or drag: decided by how far the pointer moves while pressed.
const press = createPressGesture();

function refreshHitTest(): void {
  // Stay interactive while pressed: becoming click-through mid-drag would
  // lose the release, and the drag would never end.
  if (press.pressed) return;
  setInteractive(pointer !== undefined && isOpaqueAt(pixels, pointer, OVERLAY_SCALE));
}

// Picks the frame to show: idle, with a blink now and then.
const animator = createPetAnimator(animations, { random: Math.random });

// Petting and dizziness: input becomes a reaction, which plays an
// animation and an effect.
const reactions = createReactionDetector();
const effects = createEffects();

function react(reaction: Reaction | undefined): void {
  // Opening the Tower is a request to the app, not a reaction of Mocha's.
  if (reaction === 'tower') {
    window.mocha.openTower();
    return;
  }
  if (paused || resting) return; // a napping Mocha does not react
  // A dizzy spell outlasts the petting cooldown; do not cut it short.
  if (reaction === 'pet' && animator.current === 'dizzy') return;
  if (reaction === 'pet') {
    animator.play('hop');
    effects.add('heart');
    window.mocha.petted(); // lifts Mocha's mood, within its cap
  } else if (reaction === 'dizzy') {
    animator.play('dizzy');
    effects.add('stars');
  } else if (reaction === 'slip') {
    // A dizzy Mocha is already off balance; let that play out.
    if (animator.current === 'dizzy') return;
    animator.play('slip');
    effects.add('dust');
  } else {
    return;
  }
  loop.invalidate(); // input path: react on the next frame
}

// Where the eye looks. The cursor arrives from the main process in window
// pixels and is converted to sprite pixels to compare with the eye.
let cursor: Point | undefined;
let gaze: Gaze = { x: 0, y: 0 };

/** Recomputes the gaze; returns true if it changed. */
function updateGaze(): boolean {
  const eye = appearance.eyeCenter(animator.frame);
  if (!cursor || !eye) return false; // closed eye or no cursor yet: keep looking
  const next = gazeOffset(eye, { x: cursor.x / OVERLAY_SCALE, y: cursor.y / OVERLAY_SCALE });
  if (next.x === gaze.x && next.y === gaze.y) return false;
  gaze = next;
  return true;
}

// Draws one frame. Defined as a const so TypeScript keeps `context`
// narrowed to non-null inside it.
const render = (): void => {
  context.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  updateGaze(); // the eye may have moved with the frame
  appearance.draw(context, { frame: animator.frame, hovered: interactive, gaze });
  // Read the pixels once per drawing, not on every mouse move, and before
  // effects: a heart or a star is not part of Mocha's body.
  pixels = context.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  effects.draw(context, {
    head: appearance.head(animator.frame),
    feet: appearance.feet(animator.frame),
  });
  // Mocha may have moved under a still cursor.
  refreshHitTest();
};

const loop = createGameLoop({
  // 50 ms steps: frames of 50 ms or more are always shown at least once,
  // while the loop still sleeps between steps.
  stepMs: 50,
  scheduler: createBrowserScheduler(),
  update(stepMs) {
    // A double click settles here, once no third click followed.
    react(reactions.update(stepMs));
    // Advance both every step; `||` would skip effects when the animator changed.
    const animated = animator.update(stepMs);
    const affected = effects.update(stepMs);
    return animated || affected;
  },
  render,
});

// The floor moved: the user swiped to another Space.
window.mocha.onSpaceChanged(() => react(reactions.spaceChanged()));

// Input path: a new gaze is drawn on the next frame, not the next step.
window.mocha.onCursorMove((point) => {
  cursor = point;
  if (updateGaze()) loop.invalidate();
});

window.addEventListener('mousemove', (event) => {
  pointer = { x: event.clientX, y: event.clientY };
  const wasOver = interactive;
  refreshHitTest();
  // Pet only when the cursor arrives, not while it rests on Mocha or when
  // Mocha moves under a still cursor.
  if (!wasOver && interactive) react(reactions.hover());
});

// Pointer buttons only reach the page while it is interactive, i.e. over
// Mocha. Capturing the pointer keeps the events coming while dragging.
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  canvas.setPointerCapture(event.pointerId);
  press.down({ x: event.screenX, y: event.screenY });
});
canvas.addEventListener('pointermove', (event) => {
  if (press.move({ x: event.screenX, y: event.screenY }) === 'drag-start') {
    window.mocha.dragOverlay('start');
  }
});

function release(outcome: 'click' | 'drag-end' | undefined): void {
  if (outcome === 'click') react(reactions.click());
  if (outcome === 'drag-end') {
    window.mocha.dragOverlay('end');
    refreshHitTest(); // the window moved; the cursor may be off Mocha now
  }
}
canvas.addEventListener('pointerup', () => release(press.up()));
canvas.addEventListener('pointercancel', () => release(press.cancel()));
canvas.addEventListener('lostpointercapture', () => release(press.cancel()));
document.addEventListener('mouseleave', () => {
  pointer = undefined;
  refreshHitTest();
});

// Do no work at all while the window is hidden.
// Paused from the tray: Mocha falls asleep and the loop stops completely.
let paused = false;

/** Runs the loop only while visible and not paused: no work otherwise. */
function syncLoop(): void {
  if (!paused && !document.hidden) loop.start();
  else loop.stop();
}

window.mocha.onPausedChange((next) => {
  if (next === paused) return; // main repeats the state when the page loads
  paused = next;
  effects.clear();
  animator.play(paused || resting ? 'sleep' : 'idle');
  if (paused) {
    loop.stop();
    render(); // one last frame so the sleeping pose shows
  } else {
    syncLoop();
  }
});

// A break, taken, shared from the Tower or by stepping away: Mocha naps
// until it ends, then greets the user.
let resting = false;
window.mocha.onRestingChange((next) => {
  if (next === resting) return;
  resting = next;
  if (paused) return; // the pause pose wins; resuming restores the right one
  effects.clear();
  if (resting) {
    animator.play('sleep');
  } else {
    animator.play('hop');
    effects.add('heart');
  }
  loop.invalidate();
});

// Low energy: Mocha holds its tired pose instead of idle.
window.mocha.onTiredChange((tired) => {
  if (animator.setTired(tired)) loop.invalidate();
});

document.addEventListener('visibilitychange', syncLoop);

loop.start();
// Every listener is in place: ask main for the current state.
window.mocha.ready();
