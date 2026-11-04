export interface PauseController {
  readonly paused: boolean;
  setPaused(paused: boolean): void;
  toggle(): void;
  /** Calls `listener` on every change. Returns a function that unsubscribes. */
  onChange(listener: (paused: boolean) => void): () => void;
}

/**
 * Whether Mocha is paused (resting: no animation, no cursor polling).
 *
 * One owner for the state, and everything that depends on it (the tray
 * menu label, the overlay, the cursor tracker) subscribes to changes
 * instead of being told one by one: the observer pattern.
 */
export function createPauseController(): PauseController {
  let paused = false;
  const listeners = new Set<(paused: boolean) => void>();

  const setPaused = (next: boolean) => {
    if (next === paused) return;
    paused = next;
    for (const listener of listeners) listener(paused);
  };

  return {
    get paused() {
      return paused;
    },
    setPaused,
    toggle: () => setPaused(!paused),
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
