/** Where an accessory sits on Mocha: around the neck or on the hat. */
export type AccessorySlot = 'neck' | 'hat';

/** Where a decor item goes in the Tower's room. */
export type DecorSlot = 'shelf' | 'wall' | 'floor' | 'sill';

export type ItemId =
  | 'redScarf'
  | 'bowTie'
  | 'moonPendant'
  | 'hatFeather'
  | 'hatFlower'
  | 'fern'
  | 'lantern'
  | 'inkDrawing'
  | 'crystalBall'
  | 'bookStack'
  | 'teacup';

/** Something Mocha can find: to wear, or to put in its room. */
export type Item =
  | {
      readonly id: ItemId;
      readonly title: string;
      readonly kind: 'accessory';
      readonly slot: AccessorySlot;
    }
  | {
      readonly id: ItemId;
      readonly title: string;
      readonly kind: 'decor';
      readonly slot: DecorSlot;
    };

/** Everything Mocha can find (ADR-0010), as data: new items need no code. */
export const ITEMS: readonly Item[] = Object.freeze([
  { id: 'redScarf', title: 'Red scarf', kind: 'accessory', slot: 'neck' },
  { id: 'bowTie', title: 'Bow tie', kind: 'accessory', slot: 'neck' },
  { id: 'moonPendant', title: 'Moon pendant', kind: 'accessory', slot: 'neck' },
  { id: 'hatFeather', title: 'Hat feather', kind: 'accessory', slot: 'hat' },
  { id: 'hatFlower', title: 'Hat flower', kind: 'accessory', slot: 'hat' },
  { id: 'fern', title: 'Fern', kind: 'decor', slot: 'floor' },
  { id: 'lantern', title: 'Lantern', kind: 'decor', slot: 'sill' },
  { id: 'inkDrawing', title: 'Ink drawing', kind: 'decor', slot: 'wall' },
  { id: 'crystalBall', title: 'Crystal ball', kind: 'decor', slot: 'shelf' },
  { id: 'bookStack', title: 'Book stack', kind: 'decor', slot: 'shelf' },
  { id: 'teacup', title: 'Teacup', kind: 'decor', slot: 'sill' },
]);

/** An item by its id. */
export function itemById(id: ItemId): Item {
  const found = ITEMS.find((item) => item.id === id);
  if (!found) throw new Error(`unknown item "${id}"`);
  return found;
}
