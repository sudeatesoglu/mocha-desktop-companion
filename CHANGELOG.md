# Changelog

All notable changes to Mocha are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Mocha's Tower: double-click Mocha or choose Open Tower in the menu bar to see its mood and energy in its room ([#103](https://github.com/sudeatesoglu/mocha-desktop-companion/issues/103), [#104](https://github.com/sudeatesoglu/mocha-desktop-companion/issues/104))
- Care for Mocha in the Tower: pet it, give it one of three daily treats, or rest together, which starts a break with Mocha napping. Petting Mocha on the desktop lifts its mood too ([#104](https://github.com/sudeatesoglu/mocha-desktop-companion/issues/104))
- Mocha's own app icon: the raven in its top hat in front of a full moon, drawn by the same code as Mocha on the desktop ([#98](https://github.com/sudeatesoglu/mocha-desktop-companion/issues/98))

### Security

- Images are bundled as files instead of inlined data: URLs, so every window's Content Security Policy allows images from the app only ([#104](https://github.com/sudeatesoglu/mocha-desktop-companion/issues/104))

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

[Unreleased]: https://github.com/sudeatesoglu/mocha-desktop-companion/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/sudeatesoglu/mocha-desktop-companion/releases/tag/v0.2.0
[0.1.0]: https://github.com/sudeatesoglu/mocha-desktop-companion/releases/tag/v0.1.0
