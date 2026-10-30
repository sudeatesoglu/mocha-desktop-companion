// Renderer entry. Placeholder screen until the overlay (#18) replaces it.

// Synchronous exceptions fire 'error'; rejected promises fire
// 'unhandledrejection'. Both are forwarded to the main-process log.
window.addEventListener('error', (event) => {
  window.mocha.reportError({ message: event.message, source: event.filename });
});
window.addEventListener('unhandledrejection', (event) => {
  const reason: unknown = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  window.mocha.reportError({ message: message || 'Unhandled promise rejection' });
});

const info = await window.mocha.getAppInfo();
const name = document.getElementById('name');
const version = document.getElementById('version');
if (name) name.textContent = `Hello, ${info.name}`;
if (version) version.textContent = `v${info.version}`;
