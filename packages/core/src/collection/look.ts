import type { FindsState } from './finds.ts';
import { type AccessorySlot, ITEMS, type ItemId } from './items.ts';

/** What Mocha wears: one accessory per slot, or nothing there. */
export type Look = { readonly [slot in AccessorySlot]: ItemId | null };

/** Nothing worn. */
export const BARE_LOOK: Look = Object.freeze({ neck: null, hat: null });

/** Whether `id` is an accessory for `slot` that Mocha has found. */
function fits(finds: FindsState, slot: AccessorySlot, id: ItemId): boolean {
  const item = ITEMS.find((candidate) => candidate.id === id);
  return (
    item?.kind === 'accessory' && item.slot === slot && finds.found.some((find) => find.id === id)
  );
}

/**
 * `look` with only what Mocha may wear: found accessories in their own
 * slot. For a look read from a file someone could have edited.
 */
export function validLook(look: Look, finds: FindsState): Look {
  const keep = (slot: AccessorySlot) => {
    const id = look[slot];
    return id !== null && fits(finds, slot, id) ? id : null;
  };
  const next = { neck: keep('neck'), hat: keep('hat') };
  return next.neck === look.neck && next.hat === look.hat ? look : next;
}

/**
 * Puts `id` on in `slot`, replacing what was there, or takes the slot's
 * accessory off (null). Anything not found or not for that slot is refused:
 * the same look comes back, as it does when nothing changes.
 */
export function wear(look: Look, finds: FindsState, slot: AccessorySlot, id: ItemId | null): Look {
  if (look[slot] === id) return look;
  if (id !== null && !fits(finds, slot, id)) return look;
  return { ...look, [slot]: id };
}
