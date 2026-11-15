import {
  type BreakState,
  DEFAULT_NEEDS_CONFIG,
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

    expect(towerView(needs, onBreak, none, now)).toEqual({
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
    });
  });

  it('says when Mocha is paused', () => {
    expect(towerView(startNeeds(now), { phase: 'paused' }, none, now)).toMatchObject({
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

    expect(towerView(startNeeds(now), onBreak, none, now + 30_000).breakMinutesLeft).toBe(10);
    expect(towerView(startNeeds(now), onBreak, none, now + 12 * MINUTE).breakMinutesLeft).toBe(0);
    expect(towerView(startNeeds(now), startWorking(now), none, now).breakMinutesLeft).toBeNull();
  });

  it('counts the minutes left in a focus session, rounded up', () => {
    const focusing: BreakState = {
      phase: 'focusing',
      startedAt: now,
      endsAt: now + 25 * MINUTE,
      workStartedAt: now,
    };

    expect(towerView(startNeeds(now), focusing, none, now).focusMinutesLeft).toBe(25);
    expect(towerView(startNeeds(now), focusing, none, now + 24 * MINUTE + 1).focusMinutesLeft).toBe(
      1,
    );
    expect(towerView(startNeeds(now), focusing, none, now + 26 * MINUTE).focusMinutesLeft).toBe(0);
    expect(towerView(startNeeds(now), startWorking(now), none, now).focusMinutesLeft).toBeNull();
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

    expect(towerView(startNeeds(now), startWorking(now), finds, now).finds).toEqual({
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
    expect(towerView(startNeeds(now), startWorking(now), finds, tomorrow).finds.waiting).toBe(
      false,
    );
  });

  it('says when everything was found', () => {
    const complete: FindsState = {
      ...none,
      found: ITEMS.map(({ id }) => ({ id, foundAt: now })),
    };

    expect(towerView(startNeeds(now), startWorking(now), complete, now).finds).toMatchObject({
      complete: true,
      waiting: false,
      points: 0,
    });
  });
});
