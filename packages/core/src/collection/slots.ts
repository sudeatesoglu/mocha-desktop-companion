import type { FindsState } from './finds.ts';
import { ITEMS, type Item, type ItemId } from './items.ts';

/** One item or nothing in each slot of a kind: what Mocha wears, or its room. */
export type Slots<S extends string> = { readonly [slot in S]: ItemId | null };

/** Whether `id` is an item of `kind` for `slot` that Mocha has found. */
function fits(finds: FindsState, kind: Item['kind'], slot: string, id: ItemId): boolean {
  const item = ITEMS.find((candidate) => candidate.id === id);
  return item?.kind === kind && item.slot === slot && finds.found.some((find) => find.id === id);
}

/**
 * Puts `id` in `slot`, replacing what was there, or empties the slot
 * (null). Anything not found, of another kind or for another slot is
 * refused: the same object comes back, as it does when nothing changes.
 */
export function fillSlot<S extends string>(
  slots: Slots<S>,
  finds: FindsState,
  kind: Item['kind'],
  slot: S,
  id: ItemId | null,
): Slots<S> {
  if (slots[slot] === id) return slots;
  if (id !== null && !fits(finds, kind, slot, id)) return slots;
  return { ...slots, [slot]: id };
}

/**
 * `slots` with only what may be there: found items of `kind`, each in its
 * own slot. For slots read from a file someone could have edited.
 */
export function validSlots<S extends string>(
  slots: Slots<S>,
  finds: FindsState,
  kind: Item['kind'],
): Slots<S> {
  let changed = false;
  const next: { [slot in S]: ItemId | null } = { ...slots };
  for (const slot of Object.keys(slots) as S[]) {
    const id = slots[slot];
    if (id !== null && !fits(finds, kind, slot, id)) {
      next[slot] = null;
      changed = true;
    }
  }
  return changed ? next : slots;
}
