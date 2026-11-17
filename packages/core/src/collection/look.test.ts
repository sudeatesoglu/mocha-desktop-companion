import { describe, expect, it } from 'vitest';
import { type FindsState, startFinds } from './finds.ts';
import { BARE_LOOK, type Look, validLook, wear } from './look.ts';

const finds: FindsState = {
  ...startFinds(0),
  found: [
    { id: 'redScarf', foundAt: 1 },
    { id: 'hatFeather', foundAt: 2 },
    { id: 'fern', foundAt: 3 },
  ],
};

describe('wear', () => {
  it('puts a found accessory on in its slot', () => {
    expect(wear(BARE_LOOK, finds, 'neck', 'redScarf')).toEqual({ neck: 'redScarf', hat: null });
  });

  it('replaces what was in the slot and leaves the other slot alone', () => {
    const look: Look = { neck: 'redScarf', hat: 'hatFeather' };
    const withBowTie = { ...finds, found: [...finds.found, { id: 'bowTie' as const, foundAt: 4 }] };

    expect(wear(look, withBowTie, 'neck', 'bowTie')).toEqual({ neck: 'bowTie', hat: 'hatFeather' });
  });

  it('takes an accessory off', () => {
    expect(wear({ neck: 'redScarf', hat: null }, finds, 'neck', null)).toEqual(BARE_LOOK);
  });

  it('refuses what was not found, what is not an accessory and the wrong slot', () => {
    expect(wear(BARE_LOOK, finds, 'neck', 'bowTie')).toBe(BARE_LOOK);
    expect(wear(BARE_LOOK, finds, 'neck', 'fern')).toBe(BARE_LOOK);
    expect(wear(BARE_LOOK, finds, 'hat', 'redScarf')).toBe(BARE_LOOK);
  });

  it('returns the same look when nothing changes', () => {
    const look: Look = { neck: 'redScarf', hat: null };

    expect(wear(look, finds, 'neck', 'redScarf')).toBe(look);
    expect(wear(BARE_LOOK, finds, 'hat', null)).toBe(BARE_LOOK);
  });
});

describe('validLook', () => {
  it('keeps found accessories in their slots', () => {
    const look: Look = { neck: 'redScarf', hat: 'hatFeather' };

    expect(validLook(look, finds)).toBe(look);
  });

  it('drops what Mocha may not wear', () => {
    expect(validLook({ neck: 'bowTie', hat: 'redScarf' }, finds)).toEqual(BARE_LOOK);
    expect(validLook({ neck: 'crown' as 'bowTie', hat: 'hatFeather' }, finds)).toEqual({
      neck: null,
      hat: 'hatFeather',
    });
  });
});
