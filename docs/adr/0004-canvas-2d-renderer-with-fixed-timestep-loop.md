# ADR-0004: Hand-written Canvas 2D renderer with a fixed-timestep loop

- **Status:** Accepted
- **Date:** 2026-10-20

## Context

Both windows draw pixel art at a low internal resolution: the overlay character is 48×48 pixels and the Tower scene about 192×256 pixels, scaled up by an integer factor with `image-rendering: pixelated`. Scenes are composed of a few layers (background, props, characters, interface) and sprite animations run at a handful of frames per second.

The overlay runs all day, so its idle cost matters more than its peak performance. In a spike, a naive loop that redrew the overlay on every `requestAnimationFrame` (about 60 times per second) used roughly 10% CPU on the development machine while showing an almost static sprite.

## Decision

We will write a small renderer on the **Canvas 2D API** instead of adopting a rendering engine, driven by a **fixed-timestep loop with dirty-flag rendering**:

- Game logic advances in fixed steps (100 ms in the spike). Animation speed is therefore identical on 60 Hz and 120 Hz displays, and the elapsed time per frame is clamped so a wake-up from sleep does not replay a burst of steps.
- The loop is scheduled at the step rate, not at the display refresh rate. Pixel-art animation does not benefit from 60 frames per second.
- Input is the exception: a change caused directly by the user (the eye following the cursor, hover feedback) is drawn on the next animation frame instead of waiting for the next step, so direct manipulation never lags by up to one step.
- `update()` reports whether anything visible changed. `render()` runs only when something did (the "dirty" flag), and the loop pauses while the window is hidden.
- Scenes are drawn back to front in layers (painter's algorithm).

With this loop, the same spike measured under 1% total CPU at idle, down from roughly 10%.

## Alternatives considered

- **PixiJS (WebGL):** fast, with built-in sprite sheets, filters and particles. Our scenes are small and change rarely, so its performance is not needed, and a continuously running WebGL ticker works against the low idle cost we want. It also adds a sizable dependency.
- **DOM or CSS sprites:** simple for one character, but layered scenes, per-pixel hit testing and lighting are awkward without a canvas.
- **requestAnimationFrame at full refresh rate:** measured above; too expensive for an always-on companion.

## Consequences

- The renderer stays small and fully understood, with no engine dependency to upgrade.
- The loop has two paths into `render()`: the fixed step for time-driven animation and an input path for immediate feedback. Both must go through the same dirty flag so a frame is never drawn twice.
- Effects such as lighting and particles must be implemented by us. If they become expensive, this decision can be revisited and superseded.
- Visual reactions must be designed for the low resolution: the spike showed that a 1-pixel change lasting under a second is not noticed. Reactions need a silhouette change or an effect and should last at least about a second.
- The loop and the drawing code are plain modules that can be unit-tested by injecting a clock and a canvas context.
