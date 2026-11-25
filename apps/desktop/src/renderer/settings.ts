import { type BrowserCapability, CAPABILITY_TEXTS } from '@mocha/core';
import {
  AI_FEATURE_TEXTS,
  AI_PROBLEM_TEXTS,
  AI_PROVIDERS,
  type AiFeature,
  type AiProviderChoice,
  type AiView,
  CLAUDE_MODELS,
  type ClaudeModel,
  claudeKeyHint,
  localModelHint,
} from '../shared/ai.ts';
import type { BrowserView } from '../shared/browser.ts';
import { type LoginItem, loginItemHint } from '../shared/login-item.ts';
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

// Opening at login is the system's setting: it applies at once, and the box
// always shows what the system reports, not what was clicked.
const openAtLogin = element('open-at-login', HTMLInputElement);
const openAtLoginHint = element('open-at-login-hint', HTMLElement);

function showLoginItem(item: LoginItem): void {
  openAtLogin.checked = item.openAtLogin;
  openAtLogin.disabled = !item.available;
  openAtLoginHint.textContent = loginItemHint(item);
}

openAtLogin.addEventListener('change', async () => {
  showLoginItem(await window.settings.setOpenAtLogin(openAtLogin.checked));
});
window.settings.loginItem().then(showLoginItem);

// Sounds apply at once too: turning them on plays a sample chirp.
const sounds = element('sounds', HTMLInputElement);
sounds.addEventListener('change', async () => {
  sounds.checked = await window.settings.setSounds(sounds.checked);
});
window.settings.sounds().then((enabled) => {
  sounds.checked = enabled;
});

// The browser companion. Everything applies at once and main answers with
// the new state, which is what the page shows, never what was clicked.
const browserAllowed = element('browser-allowed', HTMLInputElement);
const pairing = element('pairing', HTMLElement);
const pairingCode = element('pairing-code', HTMLElement);
const pairingStatus = element('pairing-status', HTMLElement);
const capabilityBoxes = new Map<BrowserCapability, HTMLInputElement>();

// One row per capability, from the shared texts.
const capabilities = element('capabilities', HTMLElement);
for (const { name, label, hint } of CAPABILITY_TEXTS) {
  const row = document.createElement('div');
  row.className = 'capability';
  const toggle = document.createElement('label');
  toggle.className = 'toggle';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.id = `capability-${name}`;
  box.setAttribute('aria-describedby', `capability-${name}-hint`);
  const text = document.createElement('span');
  text.textContent = label;
  toggle.append(box, text);
  const help = document.createElement('p');
  help.className = 'hint';
  help.id = `capability-${name}-hint`;
  help.textContent = hint;
  row.append(toggle, help);
  capabilities.append(row);
  capabilityBoxes.set(name, box);
  box.addEventListener('change', async () => {
    showBrowser(await window.settings.setCapability(name, box.checked));
  });
}

function showBrowser(view: BrowserView): void {
  browserAllowed.checked = view.allowed;
  pairing.hidden = view.pairingCode === null;
  pairingCode.textContent = view.pairingCode ?? '';
  for (const [name, box] of capabilityBoxes) {
    box.checked = view.capabilities[name];
    // Capabilities mean nothing until the extension may connect.
    box.disabled = !view.allowed;
  }
}

browserAllowed.addEventListener('change', async () => {
  pairingStatus.textContent = '';
  showBrowser(await window.settings.allowBrowser(browserAllowed.checked));
});
element('copy-code', HTMLButtonElement).addEventListener('click', async () => {
  const copied = await window.settings.copyPairingCode();
  pairingStatus.textContent = copied ? 'Copied. Paste it into the extension’s options.' : '';
});
element('new-code', HTMLButtonElement).addEventListener('click', async () => {
  showBrowser(await window.settings.newPairingCode());
  pairingStatus.textContent = 'New code made. The old one no longer works.';
});
window.settings.browser().then(showBrowser);

// AI (ADR-0013). Like the browser section, every change applies at once and
// the page shows what main answers. The key goes to main and never back.
const providerInputs = [
  ...document.querySelectorAll<HTMLInputElement>('input[name="ai-provider"]'),
];
const localSection = element('ai-local', HTMLElement);
const localModel = element('ai-local-model', HTMLSelectElement);
const localHint = element('ai-local-hint', HTMLElement);
const claudeSection = element('ai-claude', HTMLElement);
const keyInput = element('ai-key', HTMLInputElement);
const keyHint = element('ai-key-hint', HTMLElement);
const forgetKey = element('ai-forget-key', HTMLButtonElement);
const claudeModel = element('ai-claude-model', HTMLSelectElement);
const tryButton = element('ai-try', HTMLButtonElement);
const tryStatus = element('ai-try-status', HTMLElement);
const featureBoxes = new Map<AiFeature, HTMLInputElement>();

const features = element('ai-features', HTMLElement);
for (const { name, label, hint } of AI_FEATURE_TEXTS) {
  const row = document.createElement('div');
  row.className = 'capability';
  const toggle = document.createElement('label');
  toggle.className = 'toggle';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.id = `ai-feature-${name}`;
  box.setAttribute('aria-describedby', `ai-feature-${name}-hint`);
  const text = document.createElement('span');
  text.textContent = label;
  toggle.append(box, text);
  const help = document.createElement('p');
  help.className = 'hint';
  help.id = `ai-feature-${name}-hint`;
  help.textContent = hint;
  row.append(toggle, help);
  features.append(row);
  featureBoxes.set(name, box);
  box.addEventListener('change', async () => {
    showAi(
      await window.settings.changeAi({ change: 'feature', feature: name, enabled: box.checked }),
    );
  });
}

function showAi(view: AiView): void {
  for (const input of providerInputs) input.checked = input.value === view.provider;
  localSection.hidden = view.provider !== 'local';
  claudeSection.hidden = view.provider !== 'claude';
  const models = view.localModels ?? [];
  localModel.replaceChildren(
    ...models.map((model) => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      return option;
    }),
  );
  if (view.localModel && !models.includes(view.localModel)) {
    const missing = document.createElement('option');
    missing.value = view.localModel;
    missing.textContent = `${view.localModel} (not installed)`;
    localModel.prepend(missing);
  }
  localModel.value = view.localModel ?? '';
  localModel.disabled = models.length === 0;
  localHint.textContent = localModelHint(view.localModels);
  keyHint.textContent = claudeKeyHint(view);
  forgetKey.hidden = !view.hasClaudeKey;
  keyInput.disabled = !view.canStoreKey;
  claudeModel.value = view.claudeModel;
  for (const [name, box] of featureBoxes) {
    box.checked = view.features[name];
    // Features mean nothing while AI is off.
    box.disabled = view.provider === 'off';
  }
  tryButton.disabled = view.provider === 'off';
}

for (const input of providerInputs) {
  input.addEventListener('change', async () => {
    if (!input.checked || !(AI_PROVIDERS as readonly string[]).includes(input.value)) return;
    tryStatus.textContent = '';
    showAi(
      await window.settings.changeAi({
        change: 'provider',
        provider: input.value as AiProviderChoice,
      }),
    );
  });
}
localModel.addEventListener('change', async () => {
  showAi(await window.settings.changeAi({ change: 'localModel', model: localModel.value }));
});
claudeModel.addEventListener('change', async () => {
  if (!(CLAUDE_MODELS as readonly string[]).includes(claudeModel.value)) return;
  showAi(
    await window.settings.changeAi({
      change: 'claudeModel',
      model: claudeModel.value as ClaudeModel,
    }),
  );
});
element('ai-key-form', HTMLFormElement).addEventListener('submit', async (event) => {
  event.preventDefault();
  const key = keyInput.value.trim();
  keyInput.value = '';
  if (!key) return;
  const view = await window.settings.saveClaudeKey(key);
  showAi(view);
  if (!view.hasClaudeKey) keyHint.textContent = 'That doesn’t look like a Claude API key.';
});
forgetKey.addEventListener('click', async () => {
  showAi(await window.settings.forgetClaudeKey());
});
tryButton.addEventListener('click', async () => {
  tryButton.disabled = true;
  tryStatus.textContent = 'Asking Mocha…';
  const result = await window.settings.tryAi();
  tryStatus.textContent = result.ok ? `Mocha: “${result.text}”` : AI_PROBLEM_TEXTS[result.problem];
  tryButton.disabled = false;
});
window.settings.ai().then(showAi);
