import { describe, expect, it } from 'vitest';
import {
  loadSettings,
  MAX_EXCLUSIONS,
  type SettingsArea,
  saveExclusions,
  savePairing,
  savePaused,
} from './settings.ts';

function fakeArea(initial: Record<string, unknown> = {}) {
  const items: Record<string, unknown> = { ...initial };
  const area: SettingsArea = {
    get: async (keys) =>
      Object.fromEntries(keys.filter((key) => key in items).map((key) => [key, items[key]])),
    set: async (next) => void Object.assign(items, next),
    remove: async (keys) => {
      for (const key of keys) delete items[key];
    },
  };
  return { area, items };
}

const PAIRING = { port: 47213, token: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };

describe('extension settings', () => {
  it('starts unpaired, with nothing left out and not paused', async () => {
    expect(await loadSettings(fakeArea().area)).toEqual({ exclusions: [], paused: false });
  });

  it('keeps what was saved', async () => {
    const { area } = fakeArea();
    await savePairing(area, PAIRING);
    await saveExclusions(area, ['reddit.com']);
    await savePaused(area, true);

    expect(await loadSettings(area)).toEqual({
      pairing: PAIRING,
      exclusions: ['reddit.com'],
      paused: true,
    });
  });

  it('forgets the pairing', async () => {
    const { area, items } = fakeArea({ pairing: PAIRING });
    await savePairing(area, undefined);

    expect(items).not.toHaveProperty('pairing');
  });

  it('falls back to the defaults for anything unreadable', async () => {
    const { area } = fakeArea({
      pairing: { port: 80, token: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
      exclusions: ['https://reddit.com/r/all'],
      paused: 'yes',
    });

    expect(await loadSettings(area)).toEqual({ exclusions: [], paused: false });
  });

  it('refuses more exclusions than it keeps', async () => {
    const exclusions = Array.from({ length: MAX_EXCLUSIONS + 1 }, (_, i) => `site${i}.com`);

    expect((await loadSettings(fakeArea({ exclusions }).area)).exclusions).toEqual([]);
  });
});
