// The extension's service worker. It only wires Chrome's events to the
// extension's logic; the logic itself lives in tested modules.

// The pairing token is kept in storage: only the extension's own pages and
// this worker may read it, never a script running in a web page. Chrome
// does not remember this, so it is set whenever the worker starts, and the
// worker starts with the browser.
const restrictStorage = () =>
  void chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
restrictStorage();
chrome.runtime.onStartup.addListener(restrictStorage);

chrome.runtime.onInstalled.addListener(({ reason }) => {
  restrictStorage();
  // The first thing a new user sees is what Mocha may know, and how to pair.
  if (reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('options.html?welcome') });
  }
});

chrome.action.onClicked.addListener(() => void chrome.runtime.openOptionsPage());
