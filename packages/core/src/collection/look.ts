import type { FindsState } from './finds.ts';
import type { AccessorySlot, ItemId } from './items.ts';
import { fillSlot, type Slots, validSlots } from './slots.ts';

/** What Mocha wears: one accessory per slot, or nothing there. */
export type Look = Slots<AccessorySlot>;

/** Nothing worn. */
export const BARE_LOOK: Look = Object.freeze({ neck: null, hat: null });

/**
 * `look` with only what Mocha may wear: found accessories in their own
 * slot. For a look read from a file someone could have edited.
 */
export function validLook(look: Look, finds: FindsState): Look {
  return validSlots(look, finds, 'accessory');
}

/**
 * Puts `id` on in `slot`, replacing what was there, or takes the slot's
 * accessory off (null). Anything not found or not for that slot is refused:
 * the same look comes back, as it does when nothing changes.
 */
export function wear(look: Look, finds: FindsState, slot: AccessorySlot, id: ItemId | null): Look {
  return fillSlot(look, finds, 'accessory', slot, id);
}
