import type { ReminderChoice } from '../shared/reminder.ts';
import { reminderText } from './reminder-text.ts';

// Entry point of the break reminder bubble. It only shows what the main
// process sends and passes the user's answer back; the rules live in main.

const CHOICES: readonly ReminderChoice[] = ['accept', 'snooze', 'dismiss'];

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`reminder.html is missing #${id}`);
  return found;
}

const message = element('message');
const buttons = CHOICES.map((choice) => ({ choice, button: element(choice) }));

window.reminder.onShow((show) => {
  const text = reminderText(show);
  message.textContent = text.message;
  for (const { choice, button } of buttons) button.textContent = text[choice];
  document.body.dataset['side'] = show.side;
  document.body.dataset['ready'] = '';
});

for (const { choice, button } of buttons) {
  button.addEventListener('click', () => {
    // One answer per reminder: ignore double clicks while the window closes.
    for (const other of buttons) other.button.setAttribute('disabled', '');
    window.reminder.choose(choice);
  });
}
