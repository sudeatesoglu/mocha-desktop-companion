# ADR-0003: One state in the main process, rendered by two windows

- **Status:** Accepted
- **Date:** 2026-10-20

## Context

Mocha has two user interfaces that show the same companion:

- the **overlay**: the small character on the desktop
- the **Tower**: a larger, Tamagotchi-style window that opens when the character is clicked, with stats, actions and a detailed scene

Both must always agree. Feeding Mocha in the Tower must make the desktop character react, and petting it on the desktop must raise the mood shown in the Tower. Electron windows are separate renderer processes that share no memory, and either window may be closed at any time while the companion keeps living.

## Decision

We will keep the companion's state in the **main process** as the single source of truth and use **unidirectional data flow**:

```
window ──intent { type }──▶ main: state = reduce(state, action, now) ──snapshot──▶ every window
```

- State changes go through a **pure reducer**, `reduce(state, action, now)`, with no Electron imports, timers or I/O. The current time is a parameter, so the reducer is deterministic and unit-testable.
- Renderers hold a **read-only copy** of the state. They never send new state, only an *intent* (an action type). The main process validates it against an allowlist before reducing.
- Time-driven rules (such as ending an animation-triggering activity) are driven by a clock in the main process. Renderers cannot send time-based actions.
- When nothing changes, the reducer returns the **same object**. The main process compares references and skips the broadcast, so an idle companion produces no IPC traffic.
- Windows are views. Closing the Tower discards nothing; reopening it fetches the current snapshot. Only one Tower window exists at a time; opening it again focuses the existing one.

## Alternatives considered

- **State in each renderer, synchronized by messages:** two copies drift apart, and concurrent changes from both windows need conflict resolution.
- **A single window containing both views:** the overlay must be transparent, click-through and always on top, while the Tower is a regular focusable window. One window cannot be both.
- **State in a shared database read by each window:** adds I/O to every interaction and still needs change notifications. Persistence is a separate concern and will be layered behind the main-process state.

## Consequences

- Game rules live in one pure module that is tested without Electron (functional core, imperative shell).
- Adding a new view (for example a menu-bar popover) only requires subscribing to the snapshot.
- Every user action costs one IPC round trip. This is negligible for a companion that reacts on human timescales.
- The IPC surface must stay small and validated, because it is the only way renderers can affect state.
