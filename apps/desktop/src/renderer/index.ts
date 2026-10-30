// Renderer entry. Placeholder screen until the overlay (#18) replaces it.

window.addEventListener('error', (event) => {
  window.mocha.reportError({ message: event.message, source: event.filename });
});

const info = await window.mocha.getAppInfo();
const name = document.getElementById('name');
const version = document.getElementById('version');
if (name) name.textContent = `Hello, ${info.name}`;
if (version) version.textContent = `v${info.version}`;
