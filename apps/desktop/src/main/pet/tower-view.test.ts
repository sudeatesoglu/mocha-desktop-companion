import { DEFAULT_NEEDS_CONFIG, startNeeds } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { towerView } from './tower-view.ts';

describe('towerView', () => {
  it('rounds the needs and adds what the Tower shows about them', () => {
    const now = new Date(2026, 10, 13, 9).getTime();
    const needs = { ...startNeeds(now), mood: 61.6, energy: 20.4, treatsToday: 1 };

    expect(towerView(needs, now)).toEqual({
      mood: 62,
      energy: 20,
      tired: true,
      treatsLeft: DEFAULT_NEEDS_CONFIG.treatsPerDay - 1,
    });
  });
});
