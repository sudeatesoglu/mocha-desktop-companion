# Your data

Mocha is local-first: it has no account and no telemetry, and this site has no analytics either.

## On your Mac

To notice when you step away, Mocha reads only how long it has been since your last keyboard or mouse input, never what you type, where you click or which apps you use.

It writes two files to `~/Library/Application Support/Mocha/`:

- `settings.json`: where you placed Mocha, your break settings, quiet hours, whether sounds are on, what Mocha wears and what stands in its room, the browser extension's pairing code, what you let Mocha know, and until when it is hushed.
- `mocha.db`: when your work stretches and breaks started and ended, Mocha's mood and energy, and what Mocha found, with nothing about what you do in them.

Deleting them resets Mocha.

## In the browser

The browser extension tells Mocha only what you turn on in Settings, all off until then. It never sends anything from private windows, pages on your computer or network, sensitive sites, or sign-in, checkout and account pages, and nothing at all while paused. Mocha listens for it only while you let it connect, on your own computer only, and keeps only the latest page in memory, never on disk or in a log.

The extension itself keeps only the pairing code, the sites you leave out and whether it is paused. See [the browser extension](./browser-extension) for the details.
