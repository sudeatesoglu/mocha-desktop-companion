# Your data

Mocha is local-first: it has no account and no telemetry, and this site has no analytics either.

## On your Mac

To notice when you step away, Mocha reads only how long it has been since your last keyboard or mouse input, never what you type, where you click or which apps you use.

It writes two files to `~/Library/Application Support/Mocha/`:

- `settings.json`: where you placed Mocha, your break settings, quiet hours, whether sounds are on, what Mocha wears and what stands in its room, the browser extension's pairing code, what you let Mocha know, and until when it is hushed, and your AI choices, with a Claude key only in encrypted form.
- `mocha.db`: when your work stretches and breaks started and ended, Mocha's mood and energy, and what Mocha found, with nothing about what you do in them.

If you chat with Mocha, `mocha.db` also keeps the chat for 90 days, a short summary of each conversation and what Mocha remembers about you. You can see, change and forget each memory in the Tower, and **Forget everything** (in the Tower or in Settings) leaves nothing of them in the file.

Deleting the files resets Mocha.

## AI

AI is off until you turn it on in **Settings → AI**, and each use of it has its own switch.

- **On this computer, with Ollama:** the model runs on your Mac and nothing leaves it.
- **Claude, with your own API key:** what each feature you turn on allows goes to Anthropic, under your own account and their privacy policy. Mocha keeps your key only encrypted by the macOS keychain and never shows it again.

The chat's model sees your messages, today's numbers, Mocha's mood and energy, and what Mocha remembers. It sees your browsing only if you turn on **Let the chat see what you browse**: then Mocha keeps the last half hour of the browser details you allow, in memory only, never on disk, and forgets it when you pause, the Mac sleeps or Mocha quits. What you and Mocha say in the chat is kept like any chat; what Mocha remembers about you never includes sites or pages. Mocha keeps no logs of what is asked or answered.

## In the browser

The browser extension tells Mocha only what you turn on in Settings, all off until then. It never sends anything from private windows, pages on your computer or network, sensitive sites, or sign-in, checkout and account pages, and nothing at all while paused. Mocha listens for it only while you let it connect, on your own computer only, and keeps only the latest page in memory, never on disk or in a log.

If you turn on **Read what pages are about**, the extension also sends a page's visible text once: never forms, fields, buttons, editable or hidden parts, never chat sites, scrubbed of addresses, emails and numbers, at most 20,000 characters. Mocha's reader model, chosen in **Settings → AI → Reader model**, turns it into a one-sentence gist, and only the gist reaches comments and the chat. With a local reader model the text stays on your Mac; with Claude as the reader it goes to Anthropic. Texts and gists are kept in memory only and forgotten when you pause, the Mac sleeps or Mocha quits.

The extension itself keeps only the pairing code, the sites you leave out and whether it is paused. See [the browser extension](./browser-extension) for the details.
