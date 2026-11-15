import { type Find, type FindsEvent, type FindsState, reduceFinds, startFinds } from '@mocha/core';
import type { FindsRepository } from '../db/finds-repository.ts';

export interface FindsKeeper {
  readonly state: FindsState;
  dispatch(event: FindsEvent): void;
  /**
   * Calls `listener` on every change, with what the change found (often
   * nothing: the meter moved). Returns an unsubscribe function.
   */
  onChange(listener: (finds: FindsState, found: readonly Find[]) => void): () => void;
}

/**
 * Holds what Mocha found and its find meter in the main process (ADR-0010).
 * Every change is saved at once: they are rare, and a find must not be lost
 * to a crash. Saving is best effort: a database error is logged and never
 * stops Mocha.
 */
export function createFindsKeeper(
  repository: FindsRepository | undefined,
  now: number,
  logger: { warn(message: string, details?: unknown): void },
  random: () => number = Math.random,
): FindsKeeper {
  let state = restore();
  const listeners = new Set<(finds: FindsState, found: readonly Find[]) => void>();

  function restore(): FindsState {
    try {
      const saved = repository?.load();
      if (saved) return saved;
    } catch (error) {
      logger.warn('[db] could not read what Mocha found, starting fresh', error);
    }
    return startFinds(now);
  }

  return {
    get state() {
      return state;
    },
    dispatch(event) {
      const next = reduceFinds(state, event, random);
      if (next === state) return;
      const found = next.found.slice(state.found.length);
      state = next;
      try {
        repository?.save(state);
      } catch (error) {
        logger.warn('[db] could not save what Mocha found', error);
      }
      for (const listener of listeners) listener(state, found);
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
