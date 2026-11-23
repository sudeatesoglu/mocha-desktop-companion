import { type BrowserCapabilities, NO_BROWSER_CAPABILITIES } from '@mocha/core';
import { describe, expect, it, vi } from 'vitest';
import type { Badge } from './badge.ts';
import type { ActivityState } from './browser-activity.ts';
import { CAPABILITIES_TTL_MS, createCompanion, type SavedCounts } from './companion.ts';
import type { Connection } from './mocha-client.ts';
import type { ActiveTab } from './page-context.ts';
import { COUNTS_TTL_MS } from './page-script.ts';
import type { ExtensionSettings } from './settings.ts';

const PAIRING = { port: 47213, token: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };

function setup() {
  const world = {
    settings: { pairing: PAIRING, exclusions: [], paused: false } as ExtensionSettings,
    capabilities: { ...NO_BROWSER_CAPABILITIES, kind: true, title: true } as BrowserCapabilities,
    connection: 'connected' as Connection,
    canSee: true,
    canCount: true,
    tab: { id: 7, url: 'https://github.com/a/b', title: 'Mocha', incognito: false } as
      | ActiveTab
      | undefined,
    activity: undefined as ActivityState | undefined,
    counts: undefined as SavedCounts | undefined,
    pageScript: false,
    now: 0,
  };
  const client = {
    capabilities: vi.fn(async () => ({
      connection: world.connection,
      capabilities: world.connection === 'connected' ? world.capabilities : NO_BROWSER_CAPABILITIES,
    })),
    report: vi.fn(async () => world.connection),
  };
  const badges: Badge[] = [];
  const companion = createCompanion({
    settings: async () => world.settings,
    client,
    permissions: async () => ({ tabs: world.canSee, pages: world.canCount }),
    activeTab: async () => world.tab,
    tabs: async () => ({ count: 3, sound: true }),
    loadActivity: async () => world.activity,
    saveActivity: async (state) => {
      world.activity = state;
    },
    loadPageCounts: async () => world.counts,
    savePageCounts: async (saved) => {
      world.counts = saved;
    },
    setPageScript: async (enabled) => {
      world.pageScript = enabled;
    },
    showBadge: (badge) => badges.push(badge),
    now: () => world.now,
  });
  const lastBadge = () => badges.at(-1);
  return { world, client, companion, lastBadge };
}

describe('createCompanion', () => {
  it('tells Mocha what the user allows about the tab in front', async () => {
    const { client, companion, lastBadge } = setup();
    await companion.update();

    expect(client.report).toHaveBeenCalledWith(PAIRING, { kind: 'code', title: 'Mocha' });
    expect(lastBadge()).toEqual({ text: '', title: 'Mocha: Paired with Mocha.' });
  });

  it('asks nothing before it is paired', async () => {
    const { world, client, companion, lastBadge } = setup();
    world.settings = { exclusions: [], paused: false };
    await companion.update();

    expect(client.capabilities).not.toHaveBeenCalled();
    expect(client.report).not.toHaveBeenCalled();
    expect(lastBadge()?.title).toBe('Mocha: Not paired yet.');
  });

  it('makes Mocha forget at once when paused, then tells it nothing', async () => {
    const { world, client, companion, lastBadge } = setup();
    await companion.update();
    world.settings = { ...world.settings, paused: true };
    await companion.update();
    await companion.update();

    expect(client.report).toHaveBeenCalledTimes(2);
    expect(client.report).toHaveBeenLastCalledWith(PAIRING, {});
    expect(client.capabilities).toHaveBeenCalledTimes(1);
    expect(lastBadge()?.text).toBe('off');
  });

  it('tells nothing, and says so once, for a page the filter holds back', async () => {
    const { world, client, companion } = setup();
    world.tab = { url: 'https://www.paypal.com/myaccount', title: 'PayPal', incognito: false };
    await companion.update();
    await companion.update();

    expect(client.report).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledWith(PAIRING, {});
  });

  it('tells nothing when the browser is not in front', async () => {
    const { world, client, companion } = setup();
    world.tab = undefined;
    await companion.update();

    expect(client.report).toHaveBeenCalledWith(PAIRING, {});
  });

  it('marks the toolbar when Chrome has not let it see the tab in front', async () => {
    const { world, client, companion, lastBadge } = setup();
    world.canSee = false;
    await companion.update();

    expect(client.report).toHaveBeenCalledWith(PAIRING, {});
    expect(lastBadge()?.text).toBe('!');
  });

  it('does not look at the tab when nothing that needs it is allowed', async () => {
    const { world, client, companion, lastBadge } = setup();
    world.capabilities = { ...NO_BROWSER_CAPABILITIES, talk: true };
    world.canSee = false;
    await companion.update();

    expect(client.report).toHaveBeenCalledWith(PAIRING, {});
    expect(lastBadge()?.text).toBe('');
  });

  it('asks what is allowed once a minute, and again after a failure or a new pairing', async () => {
    const { world, client, companion } = setup();
    await companion.update();
    world.now = CAPABILITIES_TTL_MS - 1;
    await companion.update();
    expect(client.capabilities).toHaveBeenCalledTimes(1);

    world.now = CAPABILITIES_TTL_MS;
    await companion.update();
    expect(client.capabilities).toHaveBeenCalledTimes(2);

    world.connection = 'busy';
    await companion.update();
    world.connection = 'connected';
    await companion.update();
    expect(client.capabilities).toHaveBeenCalledTimes(3);

    companion.forgetCapabilities();
    await companion.update();
    world.settings = { ...world.settings, pairing: { ...PAIRING, port: 50000 } };
    await companion.update();
    expect(client.capabilities).toHaveBeenCalledTimes(5);
  });

  it('tells nothing while Mocha cannot be reached, and says why on the toolbar', async () => {
    const { world, client, companion, lastBadge } = setup();
    world.connection = 'not running';
    await companion.update();

    expect(client.report).not.toHaveBeenCalled();
    expect(lastBadge()?.title).toContain('isn’t answering');
  });

  it('notes tab switches only while browser activity is allowed, and forgets them when not', async () => {
    const { world, client, companion } = setup();
    await companion.update();
    await companion.tabSwitched();
    expect(world.activity).toBeUndefined();

    world.capabilities = { ...world.capabilities, browserActivity: true };
    companion.forgetCapabilities();
    await companion.update();
    world.now = 60_000;
    await companion.tabSwitched();
    world.now = 90_000;
    await companion.navigated();
    world.now = 100_000;
    await companion.update();
    expect(client.report).toHaveBeenLastCalledWith(PAIRING, {
      kind: 'code',
      title: 'Mocha',
      browser: { sound: true, tabs: 3, switchesPerMinute: 0.2, secondsOnPage: 10 },
    });

    world.capabilities = { ...world.capabilities, browserActivity: false };
    companion.forgetCapabilities();
    await companion.update();
    expect(world.activity).toBeUndefined();
  });

  it('starts timing a page from the first look when nothing was noted yet', async () => {
    const { world, client, companion } = setup();
    world.capabilities = { ...world.capabilities, browserActivity: true };
    world.now = 5_000;
    await companion.navigated();
    await companion.update();

    expect(client.report).toHaveBeenCalledWith(
      PAIRING,
      expect.objectContaining({ browser: expect.objectContaining({ secondsOnPage: 0 }) }),
    );
  });

  it('runs updates one at a time, so it says nothing twice', async () => {
    const { world, client, companion } = setup();
    world.tab = undefined;
    await Promise.all([companion.update(), companion.update(), companion.update()]);

    expect(client.report).toHaveBeenCalledTimes(1);
  });

  it('keeps going after an update fails', async () => {
    const { client, companion } = setup();
    client.capabilities.mockRejectedValueOnce(new Error('boom'));

    await expect(companion.update()).rejects.toThrow('boom');
    await companion.update();
    expect(client.report).toHaveBeenCalledTimes(1);
  });

  describe('page activity', () => {
    const COUNTS = { keys: 12, scrolls: 3, clicks: 2, windowSeconds: 30 };

    function counting() {
      const started = setup();
      started.world.capabilities = { ...NO_BROWSER_CAPABILITIES, kind: true, pageActivity: true };
      return started;
    }

    it('runs the page script only while allowed and granted, and not while paused', async () => {
      const { world, companion } = counting();
      await companion.update();
      expect(world.pageScript).toBe(true);

      world.canCount = false;
      companion.forgetCapabilities();
      await companion.update();
      expect(world.pageScript).toBe(false);

      world.canCount = true;
      await companion.update();
      world.settings = { ...world.settings, paused: true };
      await companion.update();
      expect(world.pageScript).toBe(false);
    });

    it('takes counts from the tab in front and passes them on', async () => {
      const { client, companion } = counting();

      expect(await companion.pageActivity(7, COUNTS)).toBe(true);
      await companion.update();
      expect(client.report).toHaveBeenLastCalledWith(PAIRING, { kind: 'code', page: COUNTS });
    });

    it('drops counts from another tab, or old ones', async () => {
      const { world, client, companion } = counting();
      await companion.pageActivity(8, COUNTS);
      await companion.update();
      expect(client.report).toHaveBeenLastCalledWith(PAIRING, { kind: 'code' });

      await companion.pageActivity(7, COUNTS);
      world.now = COUNTS_TTL_MS;
      await companion.update();
      expect(client.report).toHaveBeenLastCalledWith(PAIRING, { kind: 'code' });
    });

    it('drops counts from a page the filter holds back', async () => {
      const { world, client, companion } = counting();
      world.tab = { id: 7, url: 'https://github.com/login', title: 'Sign in', incognito: false };
      await companion.pageActivity(7, COUNTS);
      await companion.update();

      expect(client.report).toHaveBeenLastCalledWith(PAIRING, {});
    });

    it('tells a page to stop counting when it may not, and keeps nothing', async () => {
      const { world, companion } = counting();
      world.capabilities = { ...world.capabilities, pageActivity: false };
      expect(await companion.pageActivity(7, COUNTS)).toBe(false);

      world.capabilities = { ...world.capabilities, pageActivity: true };
      world.canCount = false;
      companion.forgetCapabilities();
      expect(await companion.pageActivity(7, COUNTS)).toBe(false);

      world.canCount = true;
      world.settings = { ...world.settings, paused: true };
      expect(await companion.pageActivity(7, COUNTS)).toBe(false);

      world.settings = { exclusions: [], paused: false };
      expect(await companion.pageActivity(7, COUNTS)).toBe(false);
      expect(world.counts).toBeUndefined();
    });

    it('asks Mocha for a page’s counts when the worker has just woken up', async () => {
      const { client, companion } = counting();

      expect(await companion.pageActivity(7, COUNTS)).toBe(true);
      expect(client.capabilities).toHaveBeenCalledTimes(1);
    });

    it('forgets counts when page activity is no longer allowed', async () => {
      const { world, companion } = counting();
      await companion.pageActivity(7, COUNTS);
      world.capabilities = { ...world.capabilities, pageActivity: false };
      companion.forgetCapabilities();
      await companion.update();

      expect(world.counts).toBeUndefined();
    });

    it('counts without `tabs`, telling nothing that needs it', async () => {
      const { world, client, companion, lastBadge } = counting();
      world.canSee = false;
      await companion.pageActivity(7, COUNTS);
      await companion.update();

      expect(client.report).toHaveBeenLastCalledWith(PAIRING, { page: COUNTS });
      expect(lastBadge()?.text).toBe('!');
    });

    it('marks the toolbar while Chrome has not granted access to pages', async () => {
      const { world, companion, lastBadge } = counting();
      world.capabilities = { ...NO_BROWSER_CAPABILITIES, pageActivity: true };
      world.canCount = false;
      await companion.update();

      expect(lastBadge()?.text).toBe('!');
    });
  });
});
