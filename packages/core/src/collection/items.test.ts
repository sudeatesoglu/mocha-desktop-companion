import { describe, expect, it } from 'vitest';
import { ITEMS, itemById } from './items.ts';

describe('ITEMS', () => {
  it('has unique ids', () => {
    expect(new Set(ITEMS.map(({ id }) => id)).size).toBe(ITEMS.length);
  });

  it('offers accessories for the neck and the hat, and decor for every room slot', () => {
    const slots = (kind: string) =>
      new Set(ITEMS.filter((item) => item.kind === kind).map(({ slot }) => slot));

    expect(slots('accessory')).toEqual(new Set(['neck', 'hat']));
    expect(slots('decor')).toEqual(new Set(['shelf', 'wall', 'floor', 'sill']));
  });
});

describe('itemById', () => {
  it('finds an item, and refuses an unknown one', () => {
    expect(itemById('redScarf')).toMatchObject({ title: 'Red scarf', kind: 'accessory' });
    expect(() => itemById('crown' as 'fern')).toThrow('unknown item "crown"');
  });
});
