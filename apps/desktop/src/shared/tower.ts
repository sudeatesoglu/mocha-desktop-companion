import type { AccessorySlot, DecorSlot, ItemId, Look, Room } from '@mocha/core';

/** Mocha's needs as the Tower shows them: whole numbers and flags only. */
export interface TowerView {
  /** 0 to 100. */
  mood: number;
  /** 0 to 100. */
  energy: number;
  /** Energy is low enough for Mocha to look tired. */
  tired: boolean;
  /** Treats Mocha still accepts today. */
  treatsLeft: number;
  /**
   * Whole minutes left in a break, rounded up, or null without one. During a
   * break Mocha naps, and the Tower offers to end it instead of starting one.
   */
  breakMinutesLeft: number | null;
  /** Mocha is paused from the menu bar: no break can start. */
  paused: boolean;
  /** Whole minutes left in the focus session, rounded up, or null without one. */
  focusMinutesLeft: number | null;
  /** Mocha's find meter and collection (ADR-0010). */
  finds: TowerFinds;
  /** What Mocha wears, drawn on it in the room. */
  look: Look;
  /** The found accessories, in catalog order, and how many are left to find. */
  wardrobe: { items: Wearable[]; toFind: number };
  /** What stands in the room, drawn in it. */
  room: Room;
  /** The found decor, in catalog order, and how many are left to find. */
  decor: { items: Placeable[]; toFind: number };
}

/** A found decor item, as the Collection view lists it. */
export interface Placeable {
  id: ItemId;
  title: string;
  slot: DecorSlot;
  placed: boolean;
}

/** A found accessory, as the Collection view lists it. */
export interface Wearable {
  id: ItemId;
  title: string;
  slot: AccessorySlot;
  worn: boolean;
}

/** What the Tower shows of Mocha's finds. */
export interface TowerFinds {
  /** Points towards the next find, and how many make one. */
  points: number;
  pointsPerFind: number;
  /** No more finds today: the meter waits for tomorrow. */
  waiting: boolean;
  /** Everything was found. */
  complete: boolean;
  found: number;
  total: number;
  /** The newest find's title, or null before the first. */
  latest: string | null;
}

/** The focus session lengths Mocha offers, in minutes. */
export const FOCUS_MINUTES = [25, 40, 50] as const;
export type FocusMinutes = (typeof FOCUS_MINUTES)[number];

/** What the user can do for Mocha in the Tower. */
export type TowerAction = 'pet' | 'treat' | 'rest' | 'endBreak';
