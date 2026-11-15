# ADR-0010: Let Mocha find things through a predictable meter fed by breaks

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

From v0.5 the user can dress Mocha up and decorate its room in the Tower. The items have to come from somewhere. Collecting things keeps people coming back to virtual pets, but the usual ways of handing them out work against Mocha's purpose:

- A shop with a currency turns the companion into a store.
- Random drops at random times are the reward schedule of slot machines: an unpredictable reward keeps people checking. That pulls the user in for its own sake.

Mocha already rewards rest without punishing anything ([ADR-0008](0008-punishment-free-needs.md)). Its finds should follow the same principle. They must also be hard to farm: stepping away for 5 minutes counts as a break, and breaks can be taken back to back.

## Decision

Mocha finds items through a **find meter** fed when a break ends, with rules a user can read:

- **Only rest after work counts.** A break that follows at least 20 minutes of work earns 1 point if it lasted at least 5 minutes, and 1 more if a ritual earned Mocha's mood in it. Breaks back to back earn nothing.
- **Every 3 points Mocha finds an item**, at most **2 a day**. A full meter waits for the next day, and the next break finds what was waiting.
- **Predictable timing, surprising content.** The user always sees how far the meter is. Only *which* item comes is random, among the ones not found yet.
- **Nothing is bought, lost or expires.** Items are never found twice. When everything is found, the meter stops.

With the default 40-minute work and 10-minute break rhythm, the 11 first items take about six days.

The items are data, a catalog in `@mocha/core` with an id, a title, a kind (accessory or decor) and a slot. The meter is a pure reducer (`reduceFinds`), with the random source injected and the numbers in one config object (`DEFAULT_FINDS_CONFIG`), like the needs.

## Alternatives considered

- **Random finds at random times:** more surprising, but it is the variable-ratio reward schedule this project rules out.
- **A shop with a currency earned by breaks:** gives the user choice, but adds an economy to balance and makes Mocha's home a store.
- **A bond level that unlocks items:** another stat to explain and store, and no surprise at all.
- **Everything available from the start:** the simplest, but customization would lose its link to the habits Mocha is for.
- **Points for every break, no caps:** stepping away again and again would finish the collection in hours.

## Consequences

- Breaks get a third visible effect, next to the reminder and Mocha's energy, without any failure state.
- The meter's points, the day's count and the finds (ids and timestamps) must be stored. Nothing about what the user does in a break is stored.
- New items need art and a catalog entry, no new rules. Placeholder art drawn in code comes first, as with the skin.
- Tuning means changing the config and its tests; the rules stay the same.
