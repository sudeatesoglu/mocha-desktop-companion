import {
  DEFAULT_PREFERENCES,
  PREFERENCE_LIMITS,
  preferencesSchema,
} from '../shared/preferences.ts';
import {
  type FieldName,
  type FormValues,
  fieldErrors,
  fromFormValues,
  toFormValues,
} from './settings-form.ts';

// Entry point of the settings window. The rules and messages come from the
// shared schema; the main process checks the same schema again on save.

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`settings.html is missing #${id}`);
  return found;
}

const FIELD_IDS: Record<FieldName, string> = {
  workMinutes: 'work-minutes',
  breakMinutes: 'break-minutes',
  snoozeMinutes: 'snooze-minutes',
  quietEnabled: 'quiet-enabled',
  quietStart: 'quiet-start',
  quietEnd: 'quiet-end',
};
const FIELDS = Object.keys(FIELD_IDS) as FieldName[];
const input = (field: FieldName) => element(FIELD_IDS[field], HTMLInputElement);

const form = element('settings', HTMLFormElement);
const status = element('status', HTMLElement);

// Limits and hints come from the same place as the validation.
for (const field of ['workMinutes', 'breakMinutes', 'snoozeMinutes'] as const) {
  const { min, max } = PREFERENCE_LIMITS[field];
  const id = FIELD_IDS[field];
  const box = input(field);
  box.min = String(min);
  box.max = String(max);
  element(`${id}-hint`, HTMLElement).textContent = `${min} to ${max} minutes`;
}

function syncQuietTimes(): void {
  const enabled = input('quietEnabled').checked;
  input('quietStart').disabled = !enabled;
  input('quietEnd').disabled = !enabled;
}

function fill(values: FormValues): void {
  input('workMinutes').value = values.workMinutes;
  input('breakMinutes').value = values.breakMinutes;
  input('snoozeMinutes').value = values.snoozeMinutes;
  input('quietEnabled').checked = values.quietEnabled;
  input('quietStart').value = values.quietStart;
  input('quietEnd').value = values.quietEnd;
  syncQuietTimes();
  showErrors({});
}

function read(): FormValues {
  return {
    workMinutes: input('workMinutes').value,
    breakMinutes: input('breakMinutes').value,
    snoozeMinutes: input('snoozeMinutes').value,
    quietEnabled: input('quietEnabled').checked,
    quietStart: input('quietStart').value,
    quietEnd: input('quietEnd').value,
  };
}

function showErrors(errors: Partial<Record<FieldName, string>>): void {
  for (const field of FIELDS) {
    const message = errors[field];
    const box = input(field);
    const slot = document.getElementById(`${FIELD_IDS[field]}-error`);
    if (slot) slot.textContent = message ?? '';
    if (message) box.setAttribute('aria-invalid', 'true');
    else box.removeAttribute('aria-invalid');
  }
  const first = FIELDS.find((field) => errors[field]);
  if (first) input(first).focus();
}

input('quietEnabled').addEventListener('change', syncQuietTimes);

element('defaults', HTMLButtonElement).addEventListener('click', () => {
  fill(toFormValues(DEFAULT_PREFERENCES));
  status.textContent = 'Defaults restored. Save to keep them.';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const parsed = preferencesSchema.safeParse(fromFormValues(read()));
  if (!parsed.success) {
    showErrors(fieldErrors(parsed.error.issues));
    status.textContent = '';
    return;
  }
  showErrors({});
  const saved = await window.settings.save(parsed.data);
  status.textContent = saved ? 'Saved. Changes apply right away.' : 'Could not save these values.';
});

window.settings.load().then((preferences) => fill(toFormValues(preferences)));
