import {
  type AccessorySlot,
  BARE_LOOK,
  createGameLoop,
  createPetAnimator,
  type DecorSlot,
  EMPTY_ROOM,
  type Gaze,
  gazeOffset,
  type ItemId,
  type Look,
  type Room,
  type TimeOfDay,
} from '@mocha/core';
import { FOCUS_MINUTES, type TowerAction, type TowerView } from '../shared/tower.ts';
import { drawAccessories } from './accessories.ts';
import { createBrowserScheduler } from './browser-scheduler.ts';
import { loadDefaultLook } from './default-skin.ts';
import { createEffects } from './effects.ts';
import { createFlicker } from './flicker.ts';
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

// What Mocha wears, what stands in its room and the part of the day, from
// the view. The candle burns at night and through a break.
let look: Look = BARE_LOOK;
let room: Room = EMPTY_ROOM;
let time: TimeOfDay = 'night';
let resting = false;
const flicker = createFlicker();
const candleLit = () => time === 'night' || resting;

const render = (): void => {
  drawRoom(context, { room, time, flame: candleLit() ? flicker.frame : null });
  context.save();
  context.translate(offset.x, offset.y);
  const { frame } = animator;
  appearance.draw(context, { frame, hovered: false, gaze });
  drawAccessories(context, { head: appearance.head(frame), neck: appearance.neck(frame) }, look);
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
    const flickered = flicker.update(stepMs, candleLit());
    return animated || affected || flickered;
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
const findsButton = element('finds', HTMLButtonElement);
const findsDots = element('finds-dots', HTMLElement);
const findsText = element('finds-text', HTMLElement);
const main = element('main', HTMLElement);
const collection = element('collection', HTMLElement);
const collectionBack = element('collection-back', HTMLButtonElement);
const wardrobe = element('wardrobe', HTMLUListElement);
const wardrobeNote = element('wardrobe-note', HTMLElement);
const roomItems = element('room-items', HTMLUListElement);
const roomNote = element('room-note', HTMLElement);

// What the rest button does now: start a break, or end the one running.
let restAction: TowerAction = 'rest';

function show(view: TowerView): void {
  meters.mood.value = view.mood;
  meters.energy.value = view.energy;
  const controls = towerControls(view);
  buttons.pet.disabled = controls.pet.disabled;
  buttons.treat.disabled = controls.treat.disabled;
  buttons.treat.textContent = controls.treat.label;
  buttons.rest.disabled = controls.rest.disabled;
  buttons.rest.textContent = controls.rest.label;
  restAction = controls.rest.action;
  status.textContent = controls.status;
  focusLabel.textContent = controls.focus.label;
  focusLengths.hidden = controls.focus.running;
  focusEnd.hidden = !controls.focus.running;
  for (const button of lengthButtons) button.disabled = controls.focus.disabled;
  findsDots.textContent = controls.finds.dots;
  findsDots.hidden = controls.finds.dots === '';
  findsDots.setAttribute('aria-label', controls.finds.dotsLabel);
  findsText.textContent = controls.finds.text;
  showList(wardrobe, wardrobeNote, controls.wardrobe, (slot, id) => window.tower.wear(slot, id));
  showList(roomItems, roomNote, controls.room, (slot, id) => window.tower.place(slot, id));
  if (view.look !== look || view.room !== room || view.timeOfDay !== time) {
    look = view.look;
    room = view.room;
    time = view.timeOfDay;
    loop.invalidate();
  }
  // Reading during a session comes before looking tired.
  const posed = animator.setTired(view.tired);
  if (animator.setFocus(view.focusMinutesLeft !== null) || posed) loop.invalidate();

  // Mocha naps through a break and greets the user when it ends.
  const nowResting = view.breakMinutesLeft !== null;
  if (nowResting !== resting) {
    resting = nowResting;
    effects.clear();
    animator.play(resting ? 'sleep' : 'hop');
    if (!resting) effects.add('heart');
    loop.invalidate();
  }
}

/**
 * One of the Collection view's lists, rebuilt from the controls on every
 * view: each row's title, where it goes and its button.
 */
function showList<S extends AccessorySlot | DecorSlot>(
  list: HTMLUListElement,
  noteLine: HTMLElement,
  {
    rows,
    note,
  }: {
    rows: {
      title: string;
      where: string;
      label: string;
      request: { slot: S; id: ItemId | null };
    }[];
    note: string;
  },
  send: (slot: S, id: ItemId | null) => void,
): void {
  list.replaceChildren(
    ...rows.map(({ title, where, label, request }) => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'title';
      name.textContent = title;
      const place = document.createElement('span');
      place.className = 'where';
      place.textContent = where;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => send(request.slot, request.id));
      item.append(name, place, button);
      return item;
    }),
  );
  noteLine.textContent = note;
}

/** Swaps the care controls for the Collection view and back, moving focus along. */
function showCollection(open: boolean): void {
  main.hidden = open;
  collection.hidden = !open;
  (open ? collectionBack : findsButton).focus();
}

function act(action: TowerAction): void {
  window.tower.act(action);
  // The nap starts and ends when main reports the break.
  if (action === 'rest' || action === 'endBreak') return;
  animator.play('hop');
  effects.add('heart');
  loop.invalidate();
}

buttons.pet.addEventListener('click', () => act('pet'));
buttons.treat.addEventListener('click', () => act('treat'));
buttons.rest.addEventListener('click', () => act(restAction));
// Only the offered lengths reach main; anything else is ignored there too.
for (const button of lengthButtons) {
  const minutes = FOCUS_MINUTES.find((offered) => String(offered) === button.dataset['minutes']);
  if (minutes) button.addEventListener('click', () => window.tower.focus(minutes));
}
focusEnd.addEventListener('click', () => window.tower.focus(null));
findsButton.addEventListener('click', () => showCollection(true));
collectionBack.addEventListener('click', () => showCollection(false));
window.tower.onNeeds(show);
window.tower.ready(); // listening now: ask main for the needs

// No work while the window is hidden.
const syncLoop = () => (document.hidden ? loop.stop() : loop.start());
document.addEventListener('visibilitychange', syncLoop);
syncLoop();
