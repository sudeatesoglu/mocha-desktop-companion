# ADR-0008: Give Mocha punishment-free needs that follow the user's rest

- **Status:** Accepted
- **Date:** 2026-11-13

## Context

From v0.3 Mocha has a home, the Tower, where the user sees how Mocha is doing and can care for it. Virtual pets usually have needs that run down over time, such as hunger, and a pet that is neglected gets sad, sick or dies. That loop keeps players coming back, but it works through guilt.

Mocha is a work companion whose purpose is healthy habits: it already notices long stretches of work and suggests breaks (v0.2). A pet that suffers while the user works, or after a weekend away, would turn a day of focused work into a source of guilt. That is the opposite of the goal.

## Decision

We will give Mocha two needs, both from 0 to 100, with rules that reward rest and never punish anything:

- **Energy mirrors the user's rest.** It drains while the user works and refills during breaks, while the user is away and while the app is closed. A 40-minute stretch costs about what a 10-minute break gives back. Below a threshold Mocha looks tired: a mirror of the user's day, not a penalty.
- **Mood rises with care and drifts back to neutral.** Completed breaks of at least a few minutes, pets and treats raise it. Without them it eases back towards a neutral value, from above or below, and never runs out.
- **Caps keep it honest.** A pet counts once per few minutes, and Mocha accepts a few treats per local day, so mood cannot be farmed.
- **Nothing is lost.** Mocha cannot die, get sick or leave. Paused time changes nothing.

The rules are a pure function in `@mocha/core` (`reduceNeeds`). Time comes in with events, so every rule is unit-tested without waiting. All numbers live in one config object (`DEFAULT_NEEDS_CONFIG`), to be tuned after trying them.

Only the two numbers, the caps' counters and timestamps are stored ([ADR-0007](0007-store-data-with-node-sqlite.md)). Nothing about what the user does is recorded.

## Alternatives considered

- **Classic decaying needs (hunger, happiness):** the strongest pull to come back, but it works through guilt and fits a habit tool poorly. A user on holiday would return to a miserable pet.
- **Decorative only, no needs:** the simplest, but the Tower would have no reason to exist beyond a picture, and the link to breaks would be lost.
- **One combined "wellbeing" value:** simpler to show, but it mixes the user's rest (energy) with care (mood), so neither tells a clear story.

## Consequences

- Breaks now have a visible, positive effect in two places: the reminder and Mocha's energy.
- The Tower can show bars and react to actions without any failure state to design, explain or recover from.
- Tuning is a matter of changing the config and its tests; the rules stay the same.
- New art is needed: the Tower room, a treat, a tired pose and a resting pose. Placeholders drawn by code come first, and the artist's drawings replace them later, as with the default skin.
