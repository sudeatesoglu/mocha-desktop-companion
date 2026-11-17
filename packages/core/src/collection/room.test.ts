import { describe, expect, it } from 'vitest';
import { type FindsState, startFinds } from './finds.ts';
import { EMPTY_ROOM, place, type Room, validRoom } from './room.ts';

const finds: FindsState = {
  ...startFinds(0),
  found: [
    { id: 'fern', foundAt: 1 },
    { id: 'crystalBall', foundAt: 2 },
    { id: 'bookStack', foundAt: 3 },
    { id: 'redScarf', foundAt: 4 },
  ],
};

describe('place', () => {
  it('puts a found decor item in its slot', () => {
    expect(place(EMPTY_ROOM, finds, 'floor', 'fern')).toEqual({ ...EMPTY_ROOM, floor: 'fern' });
  });

  it('replaces what was in the slot', () => {
    const room: Room = { ...EMPTY_ROOM, shelf: 'crystalBall' };

    expect(place(room, finds, 'shelf', 'bookStack')).toEqual({ ...EMPTY_ROOM, shelf: 'bookStack' });
  });

  it('clears a slot', () => {
    expect(place({ ...EMPTY_ROOM, floor: 'fern' }, finds, 'floor', null)).toEqual(EMPTY_ROOM);
  });

  it('refuses what was not found, accessories and the wrong slot', () => {
    expect(place(EMPTY_ROOM, finds, 'sill', 'lantern')).toBe(EMPTY_ROOM);
    expect(place(EMPTY_ROOM, finds, 'floor', 'redScarf')).toBe(EMPTY_ROOM);
    expect(place(EMPTY_ROOM, finds, 'wall', 'fern')).toBe(EMPTY_ROOM);
  });

  it('returns the same room when nothing changes', () => {
    expect(place(EMPTY_ROOM, finds, 'wall', null)).toBe(EMPTY_ROOM);
  });
});

describe('validRoom', () => {
  it('keeps found decor in its slots and drops the rest', () => {
    const room: Room = { shelf: 'crystalBall', wall: null, floor: 'fern', sill: null };

    expect(validRoom(room, finds)).toBe(room);
    expect(validRoom({ ...room, sill: 'teacup', wall: 'fern' }, finds)).toEqual(room);
  });
});
