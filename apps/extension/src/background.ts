// The extension's service worker. It only wires Chrome's events to the
// extension's logic; the logic itself lives in tested modules.

import { MAX_PAGE_TEXT } from '@mocha/core';
import { parseActivity } from './browser-activity.ts';
import { createCompanion } from './companion.ts';
import { createMochaClient } from './mocha-client.ts';
import {
  PAGE_PERMISSIONS,
  PAGE_SCRIPT,
  PAGE_SCRIPT_ID,
  pageActivityMessageSchema,
  parseSavedCounts,
} from './page-script.ts';
import { extractPageText } from './page-text.ts';
import { loadSettings } from './settings.ts';

// The pairing token is kept in storage: only the extension's own pages and
// this worker may read it, never a script running in a web page. Chrome
// does not remember this, so it is set whenever the worker starts, and the
// worker starts with the browser.
const restrictStorage = () =>
  void chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
restrictStorage();

const companion = createCompanion({
  settings: () => loadSettings(chrome.storage.local),
  client: createMochaClient((url, init) => fetch(url, init)),
  permissions: async () => ({
    tabs: await chrome.permissions.contains({ permissions: ['tabs'] }),
    pages: await chrome.permissions.contains(PAGE_PERMISSIONS),
  }),
  async activeTab() {
    // No browser window, or another app is in front: no tab to tell about.
    const window = await chrome.windows
      .getLastFocused({ windowTypes: ['normal'] })
      .catch(() => undefined);
    if (!window?.focused || window.id === undefined) return undefined;
    const [tab] = await chrome.tabs.query({ active: true, windowId: window.id });
    return tab && { id: tab.id, url: tab.url, title: tab.title, incognito: tab.incognito };
  },
  async tabs() {
    const open = (await chrome.tabs.query({})).filter((tab) => !tab.incognito);
    return { count: open.length, sound: open.some((tab) => tab.audible === true) };
  },
  loadActivity: async () =>
    parseActivity((await chrome.storage.session.get('activity'))['activity']),
  saveActivity: (state) =>
    state
      ? chrome.storage.session.set({ activity: state })
      : chrome.storage.session.remove('activity'),
  loadPageCounts: async () =>
    parseSavedCounts((await chrome.storage.session.get('pageCounts'))['pageCounts']),
  savePageCounts: (saved) =>
    saved
      ? chrome.storage.session.set({ pageCounts: saved })
      : chrome.storage.session.remove('pageCounts'),
  // Registered only while allowed; pages already open stop on their own
  // when the worker next tells them no.
  async setPageScript(enabled) {
    // Without the permission, there is no scripting API and nothing to remove.
    if (!chrome.scripting) return;
    const ids = (await chrome.scripting.getRegisteredContentScripts()).map(({ id }) => id);
    const registered = ids.includes(PAGE_SCRIPT_ID);
    if (enabled && !registered) await chrome.scripting.registerContentScripts([PAGE_SCRIPT]);
    if (!enabled && registered) {
      await chrome.scripting.unregisterContentScripts({ ids: [PAGE_SCRIPT_ID] });
    }
  },
  // Run in the page's main frame, in the extension's own world, from the
  // function's source: it reads the page and changes nothing (ADR-0014).
  async pageText(tabId) {
    if (!chrome.scripting) return undefined;
    const results = await chrome.scripting
      .executeScript({ target: { tabId }, func: extractPageText, args: [MAX_PAGE_TEXT] })
      .catch(() => []);
    const text: unknown = results[0]?.result;
    return typeof text === 'string' ? text : undefined;
  },
  showBadge({ text, title }) {
    void chrome.action.setBadgeText({ text });
    void chrome.action.setTitle({ title });
  },
  now: Date.now,
});

// Chrome sends several events for one change (a switch, then a title, then
// a page that finished loading): they become one update, at most one a
// second, well within Mocha's rate limit.
let pending: ReturnType<typeof setTimeout> | undefined;
function update() {
  clearTimeout(pending);
  pending = setTimeout(() => {
    companion.update().catch((error: unknown) => console.warn('[mocha] update failed', error));
  }, 1_000);
}

// Once a minute, so Mocha's latest page does not go stale while the user
// stays on it. Re-created only when missing: creating it resets its timer.
async function startHeartbeat() {
  if (!(await chrome.alarms.get('heartbeat'))) {
    await chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
  }
}
void startHeartbeat();
void chrome.action.setBadgeBackgroundColor({ color: '#5b4478' });

chrome.runtime.onStartup.addListener(() => {
  restrictStorage();
  update();
});
chrome.runtime.onInstalled.addListener(({ reason }) => {
  restrictStorage();
  update();
  // The first thing a new user sees is what Mocha may know, and how to pair.
  if (reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('options.html?welcome') });
  }
});
chrome.alarms.onAlarm.addListener(update);

chrome.tabs.onActivated.addListener(() => {
  void companion.tabSwitched();
  update();
});
chrome.tabs.onUpdated.addListener((_, change, tab) => {
  if (tab.active && change.url) void companion.navigated();
  if (change.url || change.title || change.audible !== undefined) update();
});
chrome.tabs.onCreated.addListener(update);
chrome.tabs.onRemoved.addListener(update);
chrome.windows.onFocusChanged.addListener(update);

chrome.permissions.onAdded.addListener(update);
chrome.permissions.onRemoved.addListener(update);
chrome.storage.local.onChanged.addListener((changes) => {
  if (changes['pairing']) companion.forgetCapabilities();
  update();
});

// Counts from the page-activity script: only from this extension, from a
// tab's main page, and in the expected shape. The answer tells the script
// whether to keep counting.
chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  const parsed = pageActivityMessageSchema.safeParse(message);
  const tabId = sender.tab?.id;
  if (!parsed.success || sender.id !== chrome.runtime.id || sender.frameId !== 0 || !tabId) {
    return false;
  }
  companion.pageActivity(tabId, parsed.data.counts).then(
    (keepCounting) => {
      respond({ keepCounting });
      if (keepCounting) update();
    },
    () => respond({ keepCounting: false }),
  );
  return true; // the answer comes later
});

chrome.action.onClicked.addListener(() => void chrome.runtime.openOptionsPage());
