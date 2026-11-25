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
import { CHAT_PROBLEM_TEXTS, type ChatEntry, type MemoryView } from '../shared/chat.ts';
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

const chatSection = element('chat', HTMLElement);
const memoriesSection = element('memories', HTMLElement);
const VIEWS = { main, collection, chat: chatSection, memories: memoriesSection };

/** Shows one view in place of the others, and moves focus into it. */
function showView(name: keyof typeof VIEWS, focus: HTMLElement): void {
  for (const [view, section] of Object.entries(VIEWS)) section.hidden = view !== name;
  focus.focus();
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
findsButton.addEventListener('click', () => showView('collection', collectionBack));
collectionBack.addEventListener('click', () => showView('main', findsButton));

// The chat (ADR-0013). Everything shown is plain text: Mocha's answers come
// from a model and are never trusted as HTML.
const talkButton = element('talk', HTMLButtonElement);
const chatBack = element('chat-back', HTMLButtonElement);
const chatLog = element('chat-log', HTMLOListElement);
const chatLearned = element('chat-learned', HTMLElement);
const chatStatus = element('chat-status', HTMLElement);
const chatForm = element('chat-form', HTMLFormElement);
const chatInput = element('chat-input', HTMLInputElement);
const chatSend = chatForm.querySelector('button') as HTMLButtonElement;
const memoriesButton = element('chat-memories', HTMLButtonElement);
const memoriesBack = element('memories-back', HTMLButtonElement);
const memoryList = element('memory-list', HTMLUListElement);
const memoriesEmpty = element('memories-empty', HTMLElement);
const forgetAll = element('forget-everything', HTMLButtonElement);
const memoriesStatus = element('memories-status', HTMLElement);

function bubble(from: ChatEntry['from'], text: string): HTMLLIElement {
  const item = document.createElement('li');
  item.className = from;
  item.textContent = text;
  chatLog.append(item);
  chatLog.scrollTop = chatLog.scrollHeight;
  return item;
}

function setChatAvailable(available: boolean): void {
  chatInput.disabled = !available;
  chatSend.disabled = !available;
  chatStatus.textContent = available ? '' : CHAT_PROBLEM_TEXTS.off;
}

async function openChat(): Promise<void> {
  const view = await window.tower.chat();
  chatLog.replaceChildren();
  for (const { from, text } of view.entries) bubble(from, text);
  chatLearned.hidden = view.learned.length === 0;
  chatLearned.textContent = `Mocha remembered: ${view.learned.join('; ')}`;
  setChatAvailable(view.available);
  showView('chat', view.available ? chatInput : chatBack);
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  chatInput.value = '';
  bubble('user', message);
  const answer = bubble('mocha', '…');
  let written = '';
  chatInput.disabled = true;
  chatSend.disabled = true;
  chatStatus.textContent = '';
  const reply = await window.tower.sendChat(message, (piece) => {
    written += piece;
    answer.textContent = written;
    chatLog.scrollTop = chatLog.scrollHeight;
  });
  if (reply.ok) {
    // The kept answer is the cleaned one: show that, not the raw pieces.
    answer.textContent = reply.text;
    setChatAvailable(true);
  } else {
    answer.remove();
    setChatAvailable(reply.problem !== 'off');
    chatStatus.textContent = CHAT_PROBLEM_TEXTS[reply.problem];
  }
  chatInput.focus();
});

function showMemories(memories: MemoryView[]): void {
  memoriesStatus.textContent = '';
  memoriesEmpty.hidden = memories.length > 0;
  forgetAll.hidden = memories.length === 0;
  memoryList.replaceChildren(
    ...memories.map((memory) => {
      const item = document.createElement('li');
      const text = document.createElement('span');
      text.className = 'title';
      text.textContent = memory.pinned ? `📌 ${memory.text}` : memory.text;
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.textContent = memory.pinned ? 'Unpin' : 'Pin';
      pin.addEventListener('click', async () => {
        showMemories(await window.tower.pinMemory(memory.id, !memory.pinned));
      });
      const change = document.createElement('button');
      change.type = 'button';
      change.textContent = 'Edit';
      change.addEventListener('click', () => {
        const field = document.createElement('input');
        field.value = memory.text;
        field.maxLength = 200;
        field.setAttribute('aria-label', 'Memory');
        item.replaceChildren(field);
        field.focus();
        let saved = false;
        const save = async () => {
          if (saved) return;
          saved = true;
          const text = field.value.trim();
          const kept =
            text !== '' && text !== memory.text && (await window.tower.editMemory(memory.id, text));
          showMemories(await window.tower.memories());
          if (text !== '' && text !== memory.text && !kept) {
            memoriesStatus.textContent = 'That can’t be kept as a memory.';
          }
        };
        field.addEventListener('keydown', (key) => {
          if (key.key === 'Enter') void save();
          if (key.key === 'Escape') {
            saved = true;
            void window.tower.memories().then(showMemories);
          }
        });
        field.addEventListener('blur', () => void save());
      });
      const forget = document.createElement('button');
      forget.type = 'button';
      forget.textContent = 'Forget';
      forget.setAttribute('aria-label', `Forget: ${memory.text}`);
      forget.addEventListener('click', async () => {
        showMemories(await window.tower.forgetMemory(memory.id));
      });
      item.append(text, pin, change, forget);
      return item;
    }),
  );
}

// Forgetting everything asks once more first.
let confirmForget = false;
forgetAll.addEventListener('click', async () => {
  if (!confirmForget) {
    confirmForget = true;
    forgetAll.textContent = 'Really forget everything? Click again';
    return;
  }
  confirmForget = false;
  forgetAll.textContent = 'Forget everything';
  await window.tower.forgetEverything();
  chatLog.replaceChildren();
  showMemories([]);
});

talkButton.addEventListener('click', () => void openChat());
chatBack.addEventListener('click', () => showView('main', talkButton));
memoriesButton.addEventListener('click', async () => {
  confirmForget = false;
  forgetAll.textContent = 'Forget everything';
  showMemories(await window.tower.memories());
  showView('memories', memoriesBack);
});
memoriesBack.addEventListener('click', () => void openChat());
window.tower.onNeeds(show);
window.tower.ready(); // listening now: ask main for the needs

// No work while the window is hidden.
const syncLoop = () => (document.hidden ? loop.stop() : loop.start());
document.addEventListener('visibilitychange', syncLoop);
syncLoop();
