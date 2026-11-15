import { RITUALS, type Ritual } from '@mocha/core';
import { ritualScreen } from './ritual-screen.ts';

// Entry point of the ritual bubble. It runs the chosen ritual's clock and
// shows each step; main decides what finishing it is worth.

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`ritual.html is missing #${id}`);
  return found;
}

const choose = element('choose', HTMLElement);
const guide = element('guide', HTMLElement);
const done = element('done', HTMLElement);
const title = element('title', HTMLElement);
const step = element('step', HTMLElement);
const seconds = element('seconds', HTMLElement);
const progress = element('progress', HTMLProgressElement);
const rituals = element('rituals', HTMLElement);
const justRest = element('just-rest', HTMLButtonElement);
const stop = element('stop', HTMLButtonElement);

/** How long "Nicely done" stays before the bubble closes. */
const DONE_MS = 3_000;
let timer: ReturnType<typeof setInterval> | undefined;

function begin(ritual: Ritual): void {
  window.ritual.start(ritual.id);
  choose.hidden = true;
  guide.hidden = false;
  const startedAt = performance.now();
  const update = () => {
    const screen = ritualScreen(ritual, performance.now() - startedAt);
    if (screen.kind === 'done') {
      clearInterval(timer);
      window.ritual.finish();
      guide.hidden = true;
      done.hidden = false;
      setTimeout(() => window.ritual.close(), DONE_MS);
      return;
    }
    title.textContent = screen.title;
    step.textContent = screen.text;
    seconds.textContent = `${screen.seconds}`;
    progress.value = screen.progress;
  };
  update();
  // The clock is the elapsed time, so a late tick never skips a step.
  timer = setInterval(update, 200);
}

// One button per ritual, from the data, before "Just rest".
for (const ritual of RITUALS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = ritual.title;
  button.addEventListener('click', () => begin(ritual));
  rituals.insertBefore(button, justRest);
}
justRest.addEventListener('click', () => window.ritual.close());
stop.addEventListener('click', () => {
  clearInterval(timer);
  window.ritual.close();
});

window.ritual.onShow((show) => {
  document.body.dataset['side'] = show.side;
  document.body.dataset['ready'] = '';
});
window.ritual.ready(); // listening now: ask main where the bubble sits
