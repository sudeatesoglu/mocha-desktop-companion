import { type BreakState, DEFAULT_NEEDS_CONFIG, startNeeds, startWorking } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { towerView } from './tower-view.ts';

const MINUTE = 60_000;
const now = new Date(2026, 10, 13, 9).getTime();

describe('towerView', () => {
  it('rounds the needs and adds what the Tower shows about them', () => {
    const needs = { ...startNeeds(now), mood: 61.6, energy: 20.4, treatsToday: 1 };
    const onBreak: BreakState = { phase: 'onBreak', startedAt: now, endsAt: now, workStartedAt: 0 };

    expect(towerView(needs, onBreak, now)).toEqual({
      mood: 62,
      energy: 20,
      tired: true,
      treatsLeft: DEFAULT_NEEDS_CONFIG.treatsPerDay - 1,
      resting: true,
      paused: false,
      focusMinutesLeft: null,
    });
  });

  it('says when Mocha is paused', () => {
    expect(towerView(startNeeds(now), { phase: 'paused' }, now)).toMatchObject({
      resting: false,
      paused: true,
    });
  });

  it('counts the minutes left in a focus session, rounded up', () => {
    const focusing: BreakState = {
      phase: 'focusing',
      startedAt: now,
      endsAt: now + 25 * MINUTE,
      workStartedAt: now,
    };

    expect(towerView(startNeeds(now), focusing, now).focusMinutesLeft).toBe(25);
    expect(towerView(startNeeds(now), focusing, now + 24 * MINUTE + 1).focusMinutesLeft).toBe(1);
    expect(towerView(startNeeds(now), focusing, now + 26 * MINUTE).focusMinutesLeft).toBe(0);
    expect(towerView(startNeeds(now), startWorking(now), now).focusMinutesLeft).toBeNull();
  });
});
