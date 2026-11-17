import type { FindsState } from './finds.ts';
import type { DecorSlot, ItemId } from './items.ts';
import { fillSlot, type Slots, validSlots } from './slots.ts';

/** What stands in Mocha's room: one decor item per slot, or nothing there. */
export type Room = Slots<DecorSlot>;

/** Nothing placed. */
export const EMPTY_ROOM: Room = Object.freeze({ shelf: null, wall: null, floor: null, sill: null });

/** `room` with only found decor, each item in its own slot. */
export function validRoom(room: Room, finds: FindsState): Room {
  return validSlots(room, finds, 'decor');
}

/**
 * Puts a found decor item in its slot, replacing what was there, or clears
 * the slot (null). Anything else returns the same room.
 */
export function place(room: Room, finds: FindsState, slot: DecorSlot, id: ItemId | null): Room {
  return fillSlot(room, finds, 'decor', slot, id);
}
