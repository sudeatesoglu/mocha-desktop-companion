import { type NeedsEvent, type NeedsState, reduceNeeds, startNeeds } from '@mocha/core';
import type { NeedsRepository } from '../db/needs-repository.ts';

export interface NeedsKeeper {
  readonly state: NeedsState;
  dispatch(event: NeedsEvent): void;
  /** Calls `listener` with the new state on every change. Returns an unsubscribe function. */
  onChange(listener: (needs: NeedsState) => void): () => void;
  /** Writes the current needs, for the regular save and on quit. */
  save(): void;
}

/**
 * Holds Mocha's needs in the main process. On start it restores the saved
 * needs and counts the time the app was closed as rest (ADR-0008). Saving
 * is best effort: a database error is logged and never stops Mocha.
 */
export function createNeedsKeeper(
  repository: NeedsRepository | undefined,
  now: number,
  logger: { warn(message: string, details?: unknown): void },
): NeedsKeeper {
  let state = restore();
  const listeners = new Set<(needs: NeedsState) => void>();

  function restore(): NeedsState {
    try {
      const saved = repository?.load();
      if (saved) return reduceNeeds(saved, { type: 'elapse', now, activity: 'rest' });
    } catch (error) {
      logger.warn('[db] could not read Mocha’s needs, starting fresh', error);
    }
    return startNeeds(now);
  }

  return {
    get state() {
      return state;
    },
    dispatch(event) {
      const next = reduceNeeds(state, event);
      if (next === state) return;
      state = next;
      for (const listener of listeners) listener(state);
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    save() {
      try {
        repository?.save(state);
      } catch (error) {
        logger.warn('[db] could not save Mocha’s needs', error);
      }
    },
  };
}
