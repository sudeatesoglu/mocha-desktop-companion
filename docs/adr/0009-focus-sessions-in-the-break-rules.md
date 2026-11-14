# ADR-0009: Make focus sessions part of the break rules

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

From v0.4 the user can start a focus session with Mocha ("Focus with Mocha", 25, 40 or 50 minutes). While it runs, Mocha keeps them company, and when it ends they take a break together.

The break rules already decide when a reminder comes, when a break starts and ends, and what counts as stepping away ([ADR-0008](0008-punishment-free-needs.md) builds Mocha's needs on them, and the history, the reminder and the desktop nap follow them too). A focus session changes the same things: no reminder while it runs, a break when it ends.

## Decision

We will add a **`focusing` phase** to the break state machine (`reduceBreak` in `@mocha/core`), with two events:

- **`startFocus`** with a length starts a session from work, a showing reminder or a break, which it ends. Starting one during a session replaces it. The session keeps the work stretch it belongs to; one started from a break begins a new stretch.
- **`endFocus`** stops a session early. The usual rules take over for the same stretch, so a long stretch can bring a reminder right away.

While a session runs, its end replaces the work timer: no reminder comes. When it ends, a break of the configured length starts on its own, even in quiet hours, because the user chose this rhythm. Stepping away, pausing and "Rest together" end a session the same way they end ordinary work.

A session counts as work for the history and for Mocha's needs.

## Alternatives considered

- **A separate timer next to the break rules:** simpler to add, but two sources of truth would have to agree on every edge case: a reminder during a session, stepping away, pausing.
- **A long snooze:** reuses the existing state, but a snooze does not end in a break, and "snoozed" is the wrong meaning for chosen focus time.
- **Ask before the break when a session ends:** gentler for an unfinished thought, but it brings the reminder back that the session was meant to replace. The break can still be ended right away.

## Consequences

- Every place that handles break phases has to handle `focusing`. TypeScript enforces this through the exhaustive switches over the union.
- The reminder, the desktop nap, the history and the needs follow sessions without their own logic.
- Sessions are stored as work. Telling focus time apart in the history would need a new session kind and a migration.
