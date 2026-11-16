import {
  BARE_LOOK,
  type BreakState,
  DEFAULT_NEEDS_CONFIG,
  EMPTY_ROOM,
  type FindsState,
  ITEMS,
  startFinds,
  startNeeds,
  startWorking,
} from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { towerView } from './tower-view.ts';

const MINUTE = 60_000;
const now = new Date(2026, 10, 13, 9).getTime();
const none = startFinds(now);

describe('towerView', () => {
  it('rounds the needs and adds what the Tower shows about them', () => {
    const needs = { ...startNeeds(now), mood: 61.6, energy: 20.4, treatsToday: 1 };
    const onBreak: BreakState = { phase: 'onBreak', startedAt: now, endsAt: now, workStartedAt: 0 };

    expect(
      towerView({ needs, breaks: onBreak, finds: none, look: BARE_LOOK, room: EMPTY_ROOM }, now),
    ).toEqual({
      mood: 62,
      energy: 20,
      tired: true,
      treatsLeft: DEFAULT_NEEDS_CONFIG.treatsPerDay - 1,
      paused: false,
      breakMinutesLeft: 0,
      focusMinutesLeft: null,
      finds: {
        points: 0,
        pointsPerFind: 3,
        waiting: false,
        complete: false,
        found: 0,
        total: ITEMS.length,
        latest: null,
      },
      look: BARE_LOOK,
      wardrobe: { items: [], toFind: 5 },
      room: EMPTY_ROOM,
      decor: { items: [], toFind: 6 },
    });
  });

  it('says when Mocha is paused', () => {
    expect(
      towerView(
        {
          needs: startNeeds(now),
          breaks: { phase: 'paused' },
          finds: none,
          look: BARE_LOOK,
          room: EMPTY_ROOM,
        },
        now,
      ),
    ).toMatchObject({
      breakMinutesLeft: null,
      paused: true,
    });
  });

  it('counts the minutes left in a break, rounded up', () => {
    const onBreak: BreakState = {
      phase: 'onBreak',
      startedAt: now,
      endsAt: now + 10 * MINUTE,
      workStartedAt: 0,
    };

    expect(
      towerView(
        { needs: startNeeds(now), breaks: onBreak, finds: none, look: BARE_LOOK, room: EMPTY_ROOM },
        now + 30_000,
      ).breakMinutesLeft,
    ).toBe(10);
    expect(
      towerView(
        { needs: startNeeds(now), breaks: onBreak, finds: none, look: BARE_LOOK, room: EMPTY_ROOM },
        now + 12 * MINUTE,
      ).breakMinutesLeft,
    ).toBe(0);
    expect(
      towerView(
        {
          needs: startNeeds(now),
          breaks: startWorking(now),
          finds: none,
          look: BARE_LOOK,
          room: EMPTY_ROOM,
        },
        now,
      ).breakMinutesLeft,
    ).toBeNull();
  });

  it('counts the minutes left in a focus session, rounded up', () => {
    const focusing: BreakState = {
      phase: 'focusing',
      startedAt: now,
      endsAt: now + 25 * MINUTE,
      workStartedAt: now,
    };

    expect(
      towerView(
        {
          needs: startNeeds(now),
          breaks: focusing,
          finds: none,
          look: BARE_LOOK,
          room: EMPTY_ROOM,
        },
        now,
      ).focusMinutesLeft,
    ).toBe(25);
    expect(
      towerView(
        {
          needs: startNeeds(now),
          breaks: focusing,
          finds: none,
          look: BARE_LOOK,
          room: EMPTY_ROOM,
        },
        now + 24 * MINUTE + 1,
      ).focusMinutesLeft,
    ).toBe(1);
    expect(
      towerView(
        {
          needs: startNeeds(now),
          breaks: focusing,
          finds: none,
          look: BARE_LOOK,
          room: EMPTY_ROOM,
        },
        now + 26 * MINUTE,
      ).focusMinutesLeft,
    ).toBe(0);
    expect(
      towerView(
        {
          needs: startNeeds(now),
          breaks: startWorking(now),
          finds: none,
          look: BARE_LOOK,
          room: EMPTY_ROOM,
        },
        now,
      ).focusMinutesLeft,
    ).toBeNull();
  });

  it('shows the find meter, the collection and the newest find', () => {
    const finds: FindsState = {
      found: [
        { id: 'fern', foundAt: now - 2_000 },
        { id: 'redScarf', foundAt: now - 1_000 },
      ],
      points: 3,
      day: new Date(2026, 10, 13).getTime(),
      findsToday: 2,
    };

    expect(
      towerView(
        {
          needs: startNeeds(now),
          breaks: startWorking(now),
          finds: finds,
          look: BARE_LOOK,
          room: EMPTY_ROOM,
        },
        now,
      ).finds,
    ).toEqual({
      points: 3,
      pointsPerFind: 3,
      waiting: true,
      complete: false,
      found: 2,
      total: ITEMS.length,
      latest: 'Red scarf',
    });
    // A new day: the meter no longer waits.
    const tomorrow = new Date(2026, 10, 14, 9).getTime();
    expect(
      towerView(
        {
          needs: startNeeds(now),
          breaks: startWorking(now),
          finds: finds,
          look: BARE_LOOK,
          room: EMPTY_ROOM,
        },
        tomorrow,
      ).finds.waiting,
    ).toBe(false);
  });

  it('says when everything was found', () => {
    const complete: FindsState = {
      ...none,
      found: ITEMS.map(({ id }) => ({ id, foundAt: now })),
    };

    expect(
      towerView(
        {
          needs: startNeeds(now),
          breaks: startWorking(now),
          finds: complete,
          look: BARE_LOOK,
          room: EMPTY_ROOM,
        },
        now,
      ).finds,
    ).toMatchObject({
      complete: true,
      waiting: false,
      points: 0,
    });
  });

  it('lists the found accessories with what Mocha wears, and what is left to find', () => {
    const finds: FindsState = {
      ...none,
      found: [
        { id: 'hatFeather', foundAt: now - 3_000 },
        { id: 'fern', foundAt: now - 2_000 },
        { id: 'redScarf', foundAt: now - 1_000 },
      ],
    };
    const look = { neck: 'redScarf', hat: null } as const;

    const view = towerView(
      { needs: startNeeds(now), breaks: startWorking(now), finds, look, room: EMPTY_ROOM },
      now,
    );

    expect(view.look).toBe(look);
    expect(view.wardrobe).toEqual({
      items: [
        { id: 'redScarf', title: 'Red scarf', slot: 'neck', worn: true },
        { id: 'hatFeather', title: 'Hat feather', slot: 'hat', worn: false },
      ],
      toFind: 3,
    });
  });

  it('lists the found decor with what stands in the room', () => {
    const finds: FindsState = {
      ...none,
      found: [
        { id: 'bookStack', foundAt: now - 2_000 },
        { id: 'crystalBall', foundAt: now - 1_000 },
      ],
    };
    const room = { ...EMPTY_ROOM, shelf: 'bookStack' } as const;

    const view = towerView(
      { needs: startNeeds(now), breaks: startWorking(now), finds, look: BARE_LOOK, room },
      now,
    );

    expect(view.room).toBe(room);
    expect(view.decor).toEqual({
      items: [
        { id: 'crystalBall', title: 'Crystal ball', slot: 'shelf', placed: false },
        { id: 'bookStack', title: 'Book stack', slot: 'shelf', placed: true },
      ],
      toFind: 4,
    });
  });
});
