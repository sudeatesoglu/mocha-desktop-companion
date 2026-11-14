import { createGameLoop, createPetAnimator, type Gaze, gazeOffset } from '@mocha/core';
import { FOCUS_MINUTES, type TowerAction, type TowerView } from '../shared/tower.ts';
import { createBrowserScheduler } from './browser-scheduler.ts';
import { loadDefaultLook } from './default-skin.ts';
import { createEffects } from './effects.ts';
import { loadImage } from './load-image.ts';
import { towerControls } from './tower-controls.ts';
import { drawRoom, MOCHA_SPOT, ROOM_HEIGHT, ROOM_WIDTH } from './tower-room.ts';

// Entry point of Mocha's Tower: the room with Mocha in it, its needs and
// the actions. The rules live in main (ADR-0008); this page shows them and
// passes the user's choices on.

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`tower.html is missing #${id}`);
  return found;
}

const canvas = element('room', HTMLCanvasElement);
canvas.width = ROOM_WIDTH;
canvas.height = ROOM_HEIGHT;
const context = canvas.getContext('2d');
if (!context) throw new Error('2D canvas context is unavailable');

// The Tower has no error channel of its own: a broken skin only logs here.
const { appearance, animations } = await loadDefaultLook(loadImage, (message) =>
  console.warn(message),
);
const animator = createPetAnimator(animations, { random: Math.random });
const effects = createEffects();

// Mocha stands where its feet rest in the first idle frame, on the rug.
const feet = appearance.feet(animations.idle.frames[0]) ?? { x: 24, y: 46 };
const offset = { x: MOCHA_SPOT.x - feet.x, y: MOCHA_SPOT.y - feet.y };

// The eye follows the cursor inside the room.
let gaze: Gaze = { x: 0, y: 0 };
canvas.addEventListener('pointermove', (event) => {
  const eye = appearance.eyeCenter(animator.frame);
  if (!eye) return;
  const scale = canvas.clientWidth / ROOM_WIDTH;
  const cursor = { x: event.offsetX / scale - offset.x, y: event.offsetY / scale - offset.y };
  gaze = gazeOffset(eye, cursor);
  loop.invalidate();
});

const render = (): void => {
  drawRoom(context);
  context.save();
  context.translate(offset.x, offset.y);
  appearance.draw(context, { frame: animator.frame, hovered: false, gaze });
  effects.draw(context, {
    head: appearance.head(animator.frame),
    feet: appearance.feet(animator.frame),
  });
  context.restore();
};

const loop = createGameLoop({
  stepMs: 50,
  scheduler: createBrowserScheduler(),
  update(stepMs) {
    const animated = animator.update(stepMs);
    const affected = effects.update(stepMs);
    return animated || affected;
  },
  render,
});

// --- needs and actions ---

const meters = {
  mood: element('mood', HTMLMeterElement),
  energy: element('energy', HTMLMeterElement),
};
const buttons = {
  pet: element('pet', HTMLButtonElement),
  treat: element('treat', HTMLButtonElement),
  rest: element('rest', HTMLButtonElement),
};
const status = element('status', HTMLElement);
const focusLabel = element('focus-label', HTMLElement);
const focusLengths = element('focus-lengths', HTMLElement);
const focusEnd = element('focus-end', HTMLButtonElement);
const lengthButtons = [...focusLengths.querySelectorAll('button')];

let resting = false;

function show(view: TowerView): void {
  meters.mood.value = view.mood;
  meters.energy.value = view.energy;
  const controls = towerControls(view);
  buttons.pet.disabled = controls.pet.disabled;
  buttons.treat.disabled = controls.treat.disabled;
  buttons.treat.textContent = controls.treat.label;
  buttons.rest.disabled = controls.rest.disabled;
  buttons.rest.textContent = controls.rest.label;
  status.textContent = controls.status;
  focusLabel.textContent = controls.focus.label;
  focusLengths.hidden = controls.focus.running;
  focusEnd.hidden = !controls.focus.running;
  for (const button of lengthButtons) button.disabled = controls.focus.disabled;
  // Reading during a session comes before looking tired.
  const posed = animator.setTired(view.tired);
  if (animator.setFocus(view.focusMinutesLeft !== null) || posed) loop.invalidate();

  // Mocha naps through a break and greets the user when it ends.
  if (view.resting !== resting) {
    resting = view.resting;
    effects.clear();
    animator.play(resting ? 'sleep' : 'hop');
    if (!resting) effects.add('heart');
    loop.invalidate();
  }
}

function act(action: TowerAction): void {
  window.tower.act(action);
  if (action === 'rest') return; // the nap starts when main reports the break
  animator.play('hop');
  effects.add('heart');
  loop.invalidate();
}

buttons.pet.addEventListener('click', () => act('pet'));
buttons.treat.addEventListener('click', () => act('treat'));
buttons.rest.addEventListener('click', () => act('rest'));
// Only the offered lengths reach main; anything else is ignored there too.
for (const button of lengthButtons) {
  const minutes = FOCUS_MINUTES.find((offered) => String(offered) === button.dataset['minutes']);
  if (minutes) button.addEventListener('click', () => window.tower.focus(minutes));
}
focusEnd.addEventListener('click', () => window.tower.focus(null));
window.tower.onNeeds(show);
window.tower.ready(); // listening now: ask main for the needs

// No work while the window is hidden.
const syncLoop = () => (document.hidden ? loop.stop() : loop.start());
document.addEventListener('visibilitychange', syncLoop);
syncLoop();
