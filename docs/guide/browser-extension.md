# The browser extension

With the Mocha extension for Chrome and other Chromium browsers, Mocha can keep you company while you browse: it reads along on code and docs, watches videos with you, bobs its head to music, and now and then says something about it. It knows only what you allow, decided in two places:

- **Mocha's Settings**, under **Browser**, say what Mocha may know and do. Everything is off until you turn it on.
- **Chrome** asks for its own permission once you need it, on the extension's page.

## Install it

1. Download `mocha-extension-<version>.zip` from the [latest release](https://github.com/sudeatesoglu/mocha-desktop-companion/releases/latest), next to Mocha's DMG, and unzip it.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode** and choose **Load unpacked**, then the unzipped folder.

Chrome asks for nothing at this point, and the extension's page opens with what Mocha may know. To update, unzip the new version over the old folder and click the reload button on the extension's card. The extension is not in the Chrome Web Store yet.

## Pair the extension

1. In Mocha, open **Settings** from the menu bar and turn on **Let the Mocha extension connect**.
2. Copy the pairing code there, like `47213-ABCD…`.
3. Click the Mocha icon in Chrome's toolbar and paste the code under **Pair with Mocha**. It says **Paired with Mocha.**

If it says Mocha isn't answering, check that Mocha is running and the extension may connect. If the code is wrong or old, copy it again: **New code** in Settings replaces it at once.

## What Mocha may know and do

| In Settings | What it means | Chrome asks for |
| --- | --- | --- |
| Know what kind of site you are on | Code, docs, reading, video, music, social, chat, shopping or other | "Read your browsing history" |
| Know the site's name | The domain only, like github.com | "Read your browsing history" |
| Read page titles | After addresses, emails and numbers are taken out | "Read your browsing history" |
| Notice what is going on in the browser | Whether a tab plays sound, how many are open, how often you switch and how long you stay | "Read your browsing history" |
| Notice how busy you are on a page | Typing, scrolling and clicking as counts every 30 seconds; never which key, what text or what you click, and never in password fields | "Read and change all your data on all websites", https only |
| Read what pages are about | A page's visible text, once, without forms, fields, buttons, editable or hidden parts, scrubbed and at most 20,000 characters; never on chat sites. Mocha's reader model keeps only a one-sentence gist, in memory | "Read and change all your data on all websites", https only |
| Talk about what you do | A short, playful comment when you stay a few seconds on another site, at most every twenty seconds | nothing more |
| Nudge you | A gentle word after half an hour on social media, or once after midnight | nothing more |

Mocha keeps quiet during focus sessions, breaks, rituals and quiet hours. **Hush Mocha** in the menu bar silences it for an hour or until tomorrow morning.

## What is never sent

Private windows; pages on your computer or your network; banking and payments, health, government, mail and messaging, password managers and adult sites; sign-in, sign-up, checkout, payment and account pages; the sites you leave out on the extension's page; anything while it is paused. The full lists are on the extension's page.

How the extension reaches Mocha is described in the [local API](../api) and in [ADR-0011](../adr/0011-local-api-for-the-browser-extension); what Mocha may know, in [ADR-0012](../adr/0012-what-mocha-may-know-about-browsing); how it reads pages, in ADR-0014 (proposed).
