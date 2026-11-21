# Changelog

All notable changes to Mocha are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A browser extension for Chrome and other Chromium browsers, so Mocha can keep you company while you browse. With what you allow, it tells Mocha the kind of site in front, its domain, a cleaned-up title and how busy the browser is, whenever you switch tabs and once a minute, and nothing while another app is in front. If you also allow it, it counts how often you type, scroll and click on https pages. Its options page says plainly what Mocha may know, what is never sent and what is kept, asks for Chrome's permission only once you need it, and holds the pairing code, the sites to leave out and a pause switch. The toolbar icon shows when it is paused or needs you, and the options page tells you when Mocha isn't running, isn't paired or the code is wrong ([#183](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/183), [#184](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/184), [#185](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/185), [#186](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/186))
- Mocha keeps you company in the browser, if you let it know the kind of site you are on: it reads along in red reading glasses on code, docs and articles, watches videos with a box of popcorn, bobs its head while music plays, gets shiny eyes on shopping sites and scribbles along when you type a lot. A focus session and a tired Mocha come first, and breaks, rituals and pausing win over all of them. When the browser goes quiet for three minutes, Mocha goes back to its usual self ([#187](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/187), [#189](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/189))
- Skins can provide `readAlong`, `watch`, `bob`, `shiny` and `scribble` animations ([#187](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/187))
- A Browser section in Settings: let the extension connect, copy its pairing code or make a new one, and choose, one by one, what Mocha may know and do. Everything is off by default ([#182](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/182))

### Security

- Mocha opens a local port only when you let the extension connect, on 127.0.0.1 only. Every request must carry the right Host, the extension's own origin and the pairing token, within size and rate limits. Nothing about your browsing is stored or logged ([ADR-0011](docs/adr/0011-local-api-for-the-browser-extension.md), [ADR-0012](docs/adr/0012-what-mocha-may-know-about-browsing.md), [#181](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/181))
- The extension never sends private windows, pages on your computer or network, banking, health, government, mail and messaging, password manager or adult sites, or sign-in, checkout and account pages. Addresses and numbers are taken out of titles ([#183](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/183))
- Page activity is counts over 30 seconds, never which key, what text or what was clicked. Keys in password, one-time code and card fields are not even counted. The counting script exists only while you allow it, never runs on the sensitive sites above, and stops in open pages when you turn it off or pause ([#186](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/186))
- The extension asks Chrome for no access to websites up front, can reach only Mocha on your computer, and runs only its own code. The pairing code is hidden from scripts in web pages ([#184](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/184))

## [0.5.0] - 2026-11-17

"Make it yours": Mocha finds little things during your breaks, to wear and to decorate its Tower, which now follows your day.

### Added

- Mocha finds things during breaks. Rest that follows at least 20 minutes of work fills a meter in the Tower, and every 3 points Mocha finds something new, at most 2 a day, with a sparkle on the desktop. The timing is predictable, and nothing is bought or lost ([ADR-0010](docs/adr/0010-finds-earned-by-breaks.md), ([#156](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/156), [#159](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/159)))
- Dress Mocha up with what it found: open the Collection from the Finds row in the Tower and wear a scarf, a bow tie or a moon pendant, and a feather or a flower on the hat. Mocha wears them on the desktop and in the Tower, in every pose ([#160](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/160), [#161](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/161))
- Decorate Mocha's room with what it found: place a fern, a lantern, an ink drawing, a crystal ball, a stack of books or a teacup on the shelf, the wall, the floor or the window sill ([#162](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/162))
- The Tower follows your day: its window shows dawn, day, dusk or night, the room's light changes with it, and a candle flickers on the shelf at night and during breaks ([#163](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/163))
- Open Mocha when you log in, from a new General section in Settings. It is off by default and shows what macOS reports, including when macOS waits for you to allow it ([#164](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/164))
- Optional sounds, off by default: short, quiet chirps when you pet Mocha, a break is due, a ritual ends or Mocha finds something, synthesized in the app with no audio files ([#165](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/165))
- Skins can provide a `neck` anchor, where neck accessories sit ([#160](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/160))

### Security

- The Tower can only ask to wear or place a known item in a known slot, and main checks every request against what Mocha really found. What Mocha wears and what stands in its room are read from the settings file through the same checks ([#161](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/161), [#162](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/162))
- The new settings take only on or off: a page cannot pass Electron's login item options, such as another app's path ([#164](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/164), [#165](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/165))

### Known limitations

- The accessories, the decor, the Tower's room and the ritual and focus poses are placeholder art drawn in code, until the hand-drawn versions replace them.
- The parts of the day follow fixed hours (dawn from 6:00, day from 8:00, dusk from 17:00, night from 20:00), not the local sunrise and sunset.
- Focus sessions count as work in today's numbers; focus time is not shown on its own.
- Breaks are noticed from keyboard and mouse input only: reading or watching something for 5 minutes without touching anything counts as a break.
- The app is ad-hoc signed, not signed with an Apple Developer ID: a downloaded copy must be allowed once in System Settings (see the README).
- macOS only. Windows and Linux are planned.

## [0.4.0] - 2026-11-15

"Together": Mocha keeps you company through work and breaks, with focus sessions side by side and short rituals in every break.

### Added

- Focus with Mocha: start a 25, 40 or 50-minute focus session from the menu bar or the Tower. Mocha reads next to you, no reminder interrupts, and a break starts when the session ends ([#131](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/131), [#133](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/133))
- Break rituals: when a planned break starts, a bubble next to Mocha offers to breathe, rest your eyes or stretch together. It guides each step with a countdown while Mocha does it with you, changing pose with every step. Box breathing goes in 3-second steps. A finished ritual lifts Mocha's mood once per break ([#130](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/130), [#134](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/134), [#140](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/140), [#142](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/142))
- See how long a break has left in the menu bar and the Tower, and end it early with End Break ([#138](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/138))
- Skins can provide `focus` for focus sessions and an animation for each kind of ritual step: `breathe`, `lookFar`, `slowBlink`, `shoulderRoll`, `reachUp`, `leanLeft`, `leanRight`, `tiltLeft`, `tiltRight` and `flutter` ([#132](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/132), [#139](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/139), [#140](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/140))

### Security

- The ritual bubble has its own preload and accepts messages only from the open bubble: a ritual from an allow-list, and finishing or closing with no data. Main decides what a finished ritual is worth: only once per break, and only if it really took its full length, so a page cannot raise Mocha's mood by reporting finishes ([#134](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/134))
- The Tower can only ask for one of the offered focus lengths, and its actions stay an allow-list ([#133](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/133), [#138](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/138))

### Known limitations

- The ritual and focus poses, the Tower's room, the treat and the tired pose are placeholder art drawn in code, until the hand-drawn versions replace them.
- Focus sessions count as work in today's numbers; focus time is not shown on its own.
- Breaks are noticed from keyboard and mouse input only: reading or watching something for 5 minutes without touching anything counts as a break.
- The app is ad-hoc signed, not signed with an Apple Developer ID: a downloaded copy must be allowed once in System Settings (see the README).
- macOS only. Windows and Linux are planned.

## [0.3.0] - 2026-11-14

"The Tower": Mocha gets a home of its own, with a mood and an energy that follow your rest.

### Added

- Mocha's Tower: double-click Mocha or choose Open Tower in the menu bar to see it in its room, with its mood and energy ([#111](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/111), [#114](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/114))
- Mocha has a mood and an energy that follow your rest and never punish you: energy drains while you work and comes back with every break and overnight, and mood rises with breaks and care and drifts back to neutral. Both are kept across restarts ([#107](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/107), [#110](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/110))
- Care for Mocha in the Tower: pet it, give it one of three daily treats, or rest together, which starts a break. Petting Mocha on the desktop lifts its mood too ([#114](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/114))
- When its energy is low, Mocha looks tired, on the desktop and in the Tower: it slumps with its hat slipping over a heavy eye, nods off and jerks awake, and yawns. Skins can provide this as a `tired` animation ([#115](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/115), [#117](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/117))
- Mocha naps on the desktop during every break, including one you start from the Tower, not only while you are away ([#119](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/119))
- Mocha's own app icon: the raven in its top hat in front of a full moon, drawn by the same code as Mocha on the desktop ([#99](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/99))

### Security

- The Tower has its own preload and accepts its actions only from itself, and the overlay's requests to open it or report a pet carry no data ([#111](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/111), [#114](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/114))
- Images are bundled as files instead of inlined data: URLs, so every window's Content Security Policy allows images from the app only ([#114](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/114))

### Known limitations

- The Tower's room, the treat and the tired pose are placeholder art drawn in code, until the hand-drawn versions replace them.
- Breaks are noticed from keyboard and mouse input only: reading or watching something for 5 minutes without touching anything counts as a break.
- The app is ad-hoc signed, not signed with an Apple Developer ID: a downloaded copy must be allowed once in System Settings (see the README).
- macOS only. Windows and Linux are planned.

## [0.2.0] - 2026-11-10

"Healthy habits": Mocha notices long stretches of work and suggests a break.

### Added

- After 40 minutes of work, a speech bubble next to Mocha suggests a 10-minute break: take it, snooze it for 10 minutes or skip it. The bubble never takes keyboard focus ([#84](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/84))
- Settings, from the menu bar: work, break and snooze lengths, and quiet hours without reminders. Changes apply at once ([#86](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/86))
- Today's active time, number of breaks and longest stretch at the top of the menu bar menu, current whenever it opens ([#87](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/87))
- Mocha naps while you are away (idle, asleep or locked) and greets you when you return ([#83](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/83))
- A local history of work stretches and breaks, stored as start and end times only. A session cut short by a crash is closed at the last moment Mocha saw it ([#79](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/79), [#85](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/85))
- Mocha slips, with dust at its feet, after you switch Spaces ([#63](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/63))

### Removed

- The unused `look` animation from the skin format. The eye follows the cursor through the code-drawn pupil ([#69](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/69))

### Security

- Each window gets its own preload with only its own operations, and the reminder and settings windows accept messages only from themselves ([#84](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/84), [#86](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/86))
- Installers are built by the release workflow, with signed build provenance and checksums ([#62](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/62))

### Known limitations

- Breaks are noticed from keyboard and mouse input only: reading or watching something for 5 minutes without touching anything counts as a break.
- The app is ad-hoc signed, not signed with an Apple Developer ID: a downloaded copy must be allowed once in System Settings (see the README).
- macOS only. Windows and Linux are planned.

## [0.1.0] - 2026-11-05

The first release, "Hello, Mocha": a pixel-art raven that lives on the macOS desktop and reacts to you.

### Added

- Mocha appears in a transparent, frameless overlay in the bottom-right corner, floats above other apps (including fullscreen ones) and lets clicks pass through everywhere except its own pixels ([#30](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/30))
- A fixed-timestep game loop that animates at a steady speed while using well under 1% CPU at rest ([#31](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/31))
- Skins: Mocha's look comes from a validated sprite sheet and manifest, with a placeholder raven in a top hat as the default ([#34](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/34)); format documented in [docs/skins.md](docs/skins.md)
- A soft ground shadow that shrinks when Mocha leaves the ground ([#36](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/36))
- Breathing with the skin's frame timing and blinking at irregular intervals ([#37](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/37))
- Mocha's eye follows the cursor anywhere on screen ([#38](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/38))
- Petting: hovering makes Mocha hop with a rising heart; four quick clicks make it dizzy ([#39](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/39))
- Drag Mocha anywhere; its position is remembered and kept on a visible display ([#42](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/42))
- A menu-bar icon to pause, resume, reset the position, show About and quit ([#43](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/43))
- Installable DMGs for Apple Silicon and Intel ([#46](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/46))

### Fixed

- Hover feedback is shown in Mocha's pupil, since macOS ignores cursor changes from an app that never activates ([#33](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/33))
- Clicking Mocha no longer takes keyboard focus from the app you are typing in ([#41](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/41))

### Security

- Every window uses context isolation, a sandbox and a strict Content Security Policy; renderer messages are validated by sender and schema ([#28](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/28))
- Renderer error reports are rate-limited per window ([#44](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/44))
- The packaged app is fully bundled and hardened with Electron fuses ([#46](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/46))
- Development dependencies patched and Dependabot enabled ([#48](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/48))

### Known limitations

- The app is ad-hoc signed, not signed with an Apple Developer ID: a downloaded copy must be allowed once in System Settings (see the README).
- macOS only. Windows and Linux are planned.

[Unreleased]: https://github.com/sudeatesoglu/mocha-desktop-companion/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/sudeatesoglu/mocha-desktop-companion/releases/tag/v0.5.0
[0.4.0]: https://github.com/sudeatesoglu/mocha-desktop-companion/releases/tag/v0.4.0
[0.3.0]: https://github.com/sudeatesoglu/mocha-desktop-companion/releases/tag/v0.3.0
[0.2.0]: https://github.com/sudeatesoglu/mocha-desktop-companion/releases/tag/v0.2.0
[0.1.0]: https://github.com/sudeatesoglu/mocha-desktop-companion/releases/tag/v0.1.0
