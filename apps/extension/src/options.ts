// The options page: what Mocha may know, pairing, sites to leave out and the
// pause switch. It wires the page to tested modules and holds no rules.
import {
  type BrowserCapabilities,
  CAPABILITY_TEXTS,
  parsePairingCode,
  SENSITIVE_DOMAINS,
  type SensitiveKind,
} from '@mocha/core';
import { CONNECTION_TEXTS } from './connection-texts.ts';
import { parseExclusion, withExclusion } from './exclusions.ts';
import { createMochaClient } from './mocha-client.ts';
import { needsTabs } from './page-context.ts';
import { PAGE_PERMISSIONS } from './page-script.ts';
import { SENSITIVE_KIND_LABELS } from './sensitive-texts.ts';
import { loadSettings, saveExclusions, savePairing, savePaused } from './settings.ts';

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`#${id} is missing`);
  return found;
}

const area = chrome.storage.local;
const client = createMochaClient((url, init) => fetch(url, init));
const connectionLine = element('connection', HTMLElement);
const codeInput = element('pairing-code', HTMLInputElement);
const forget = element('forget', HTMLButtonElement);
const capabilityList = element('capabilities', HTMLElement);
const tabsNotice = element('tabs-notice', HTMLElement);
const pagesNotice = element('pages-notice', HTMLElement);
const exclusionInput = element('exclusion', HTMLInputElement);
const exclusionStatus = element('exclusion-status', HTMLElement);
const exclusionList = element('exclusions', HTMLElement);
const paused = element('paused', HTMLInputElement);

element('welcome', HTMLElement).hidden = !new URLSearchParams(location.search).has('welcome');

// The never-sent lists, straight from the filter's own data.
const sensitive = element('sensitive', HTMLElement);
for (const [kind, domains] of Object.entries(SENSITIVE_DOMAINS) as [SensitiveKind, string[]][]) {
  const item = document.createElement('li');
  const name = document.createElement('strong');
  name.textContent = `${SENSITIVE_KIND_LABELS[kind]}: `;
  item.append(name, domains.join(', '));
  sensitive.append(item);
}

function showCapabilities(capabilities: BrowserCapabilities | undefined): void {
  capabilityList.replaceChildren(
    ...CAPABILITY_TEXTS.map(({ name, label }) => {
      const item = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = label;
      const state = document.createElement('span');
      state.className = 'state';
      state.textContent = capabilities ? (capabilities[name] ? 'On' : 'Off') : '–';
      if (capabilities?.[name]) state.dataset['on'] = '';
      item.append(text, state);
      return item;
    }),
  );
}

async function showConnection(): Promise<void> {
  const { pairing } = await loadSettings(area);
  forget.hidden = !pairing;
  codeInput.placeholder = pairing ? `Paired on port ${pairing.port}` : '47213-ABCD…';
  const { connection, capabilities } = await client.capabilities(pairing);
  connectionLine.textContent = CONNECTION_TEXTS[connection];
  connectionLine.dataset['state'] =
    connection === 'connected' ? 'connected' : connection === 'not paired' ? '' : 'problem';
  showCapabilities(connection === 'connected' ? capabilities : undefined);
  const connected = connection === 'connected';
  tabsNotice.hidden = !(
    connected &&
    needsTabs(capabilities) &&
    !(await chrome.permissions.contains({ permissions: ['tabs'] }))
  );
  pagesNotice.hidden = !(
    connected &&
    (capabilities.pageActivity || capabilities.pageContent) &&
    !(await chrome.permissions.contains(PAGE_PERMISSIONS))
  );
}

// Chrome asks only after a click on the page: a permission is never asked
// for in the background.
element('allow-tabs', HTMLButtonElement).addEventListener('click', async () => {
  await chrome.permissions.request({ permissions: ['tabs'] });
  await showConnection();
});
element('allow-pages', HTMLButtonElement).addEventListener('click', async () => {
  await chrome.permissions.request(PAGE_PERMISSIONS);
  await showConnection();
});

element('pair-form', HTMLFormElement).addEventListener('submit', async (event) => {
  event.preventDefault();
  const pairing = parsePairingCode(codeInput.value);
  if (!pairing) {
    connectionLine.textContent =
      'That isn’t a pairing code. It looks like 47213-ABCD… and is in Mocha’s Settings, under Browser.';
    connectionLine.dataset['state'] = 'problem';
    return;
  }
  await savePairing(area, pairing);
  codeInput.value = '';
  await showConnection();
});

forget.addEventListener('click', async () => {
  await savePairing(area, undefined);
  await showConnection();
});

function showExclusions(exclusions: readonly string[]): void {
  exclusionList.replaceChildren(
    ...exclusions.map((domain) => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = domain;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'link';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Stop leaving out ${domain}`);
      remove.addEventListener('click', async () => {
        const next = (await loadSettings(area)).exclusions.filter((other) => other !== domain);
        await saveExclusions(area, next);
        showExclusions(next);
      });
      item.append(name, remove);
      return item;
    }),
  );
}

element('exclusion-form', HTMLFormElement).addEventListener('submit', async (event) => {
  event.preventDefault();
  const domain = parseExclusion(exclusionInput.value);
  if (!domain) {
    exclusionStatus.textContent = 'Type a site, like reddit.com, or paste its address.';
    return;
  }
  const next = withExclusion((await loadSettings(area)).exclusions, domain);
  if (!next) {
    exclusionStatus.textContent = 'That’s as many sites as can be left out. Remove one first.';
    return;
  }
  await saveExclusions(area, next);
  exclusionInput.value = '';
  exclusionStatus.textContent = `${domain} is left out.`;
  showExclusions(next);
});

paused.addEventListener('change', () => void savePaused(area, paused.checked));

const settings = await loadSettings(area);
paused.checked = settings.paused;
showExclusions(settings.exclusions);
showCapabilities(undefined);
await showConnection();
