# Changelog

All notable changes to Mocha are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Mocha slips, with dust at its feet, after you switch Spaces on macOS ([#63](https://github.com/sudeatesoglu/mocha-desktop-companion/pull/63))
- Mocha naps while you are away (idle, asleep or locked) and greets you when you return ([#74](https://github.com/sudeatesoglu/mocha-desktop-companion/issues/74))
- A local SQLite database for the coming work and break history ([#72](https://github.com/sudeatesoglu/mocha-desktop-companion/issues/72))

### Removed

- The unused `look` animation from the skin format; the eye follows the cursor through the code-drawn pupil

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

[Unreleased]: https://github.com/sudeatesoglu/mocha-desktop-companion/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sudeatesoglu/mocha-desktop-companion/releases/tag/v0.1.0
