import {
  type BrowserCapabilities,
  type BrowsingContext,
  NO_BROWSER_CAPABILITIES,
} from '@mocha/core';
import type { PageCounts } from './activity-counter.ts';
import { type Badge, badgeFor } from './badge.ts';
import {
  type ActivityState,
  browserStats,
  freshActivity,
  recordNavigation,
  recordSwitch,
} from './browser-activity.ts';
import type { Connection, MochaClient } from './mocha-client.ts';
import { type ActiveTab, needsTabs, pageContext } from './page-context.ts';
import { COUNTS_TTL_MS } from './page-script.ts';
import type { ExtensionSettings, Pairing } from './settings.ts';

/** What Mocha allows is asked again after this long. */
export const CAPABILITIES_TTL_MS = 60_000;

/** The latest counts from a page, and which tab they came from. */
export interface SavedCounts {
  tabId: number;
  at: number;
  counts: PageCounts;
}

/** What the companion needs from Chrome, so tests can fake it. */
export interface CompanionPorts {
  settings(): Promise<ExtensionSettings>;
  client: MochaClient;
  /**
   * What Chrome lets the extension do: see the tab in front (`tabs`), and
   * count activity on https pages (`scripting` and https sites).
   */
  permissions(): Promise<{ tabs: boolean; pages: boolean }>;
  /** The tab in front, or undefined when the browser is not in front. */
  activeTab(): Promise<ActiveTab | undefined>;
  /** Open tabs outside private windows, and whether one plays sound. */
  tabs(): Promise<{ count: number; sound: boolean }>;
  loadActivity(): Promise<ActivityState | undefined>;
  saveActivity(state: ActivityState | undefined): Promise<void>;
  loadPageCounts(): Promise<SavedCounts | undefined>;
  savePageCounts(saved: SavedCounts | undefined): Promise<void>;
  /** Registers the page-activity script, or removes it. */
  setPageScript(enabled: boolean): Promise<void>;
  showBadge(badge: Badge): void;
  now(): number;
}

/**
 * Tells Mocha what the user allows about the tab in front, whenever it
 * changes and once a minute, and shows on the toolbar how it goes.
 */
export function createCompanion(ports: CompanionPorts) {
  let asked:
    | { pairing: Pairing; at: number; connection: Connection; capabilities: BrowserCapabilities }
    | undefined;
  // Whether Mocha was last told `{}`: there is no need to say it twice.
  let toldNothing = false;
  // One step at a time, in order.
  let queue = Promise.resolve();
  function inTurn<T>(step: () => Promise<T>): Promise<T> {
    const result = queue.then(step);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function capabilitiesFor(pairing: Pairing) {
    const now = ports.now();
    const fresh =
      asked?.connection === 'connected' &&
      asked.pairing.port === pairing.port &&
      asked.pairing.token === pairing.token &&
      now - asked.at < CAPABILITIES_TTL_MS;
    if (!fresh) asked = { pairing, at: now, ...(await ports.client.capabilities(pairing)) };
    return asked as NonNullable<typeof asked>;
  }

  async function tell(pairing: Pairing, context: BrowsingContext): Promise<Connection> {
    const nothing = Object.keys(context).length === 0;
    if (nothing && toldNothing) return 'connected';
    const connection = await ports.client.report(pairing, context);
    toldNothing = nothing && connection === 'connected';
    if (connection !== 'connected') asked = undefined;
    return connection;
  }

  // Counts only from the tab in front, and only while they are recent.
  async function countsFor(tab: ActiveTab | undefined): Promise<PageCounts | undefined> {
    const saved = await ports.loadPageCounts();
    if (!saved || tab?.id !== saved.tabId || ports.now() - saved.at >= COUNTS_TTL_MS) {
      return undefined;
    }
    return saved.counts;
  }

  async function update(): Promise<void> {
    const settings = await ports.settings();
    if (!settings.pairing) {
      ports.showBadge(
        badgeFor({ connection: 'not paired', paused: settings.paused, needsPermission: false }),
      );
      return;
    }
    // Paused: Mocha forgets the page at once, then hears nothing.
    if (settings.paused) {
      await ports.setPageScript(false);
      await ports.savePageCounts(undefined);
      if (!toldNothing) await tell(settings.pairing, {});
      ports.showBadge(badgeFor({ connection: 'connected', paused: true, needsPermission: false }));
      return;
    }
    const { connection, capabilities } = await capabilitiesFor(settings.pairing);
    const granted = await ports.permissions();
    const wantsTabs = needsTabs(capabilities);
    const canSee = wantsTabs && granted.tabs;
    const canCount = capabilities.pageActivity && granted.pages;
    if (!(capabilities.browserActivity && canSee)) await ports.saveActivity(undefined);
    if (!canCount) await ports.savePageCounts(undefined);
    await ports.setPageScript(connection === 'connected' && canCount);

    let context: BrowsingContext = {};
    if (connection === 'connected' && (canSee || canCount)) {
      const tab = await ports.activeTab();
      // What needs `tabs` stays unknown until Chrome grants it, even though
      // the access to https sites for page activity would show the page.
      const allowed = canSee
        ? capabilities
        : { ...NO_BROWSER_CAPABILITIES, pageActivity: capabilities.pageActivity };
      context = pageContext({
        tab,
        exclusions: settings.exclusions,
        capabilities: allowed,
        browser: allowed.browserActivity
          ? browserStats(
              (await ports.loadActivity()) ?? freshActivity(ports.now()),
              ports.now(),
              await ports.tabs(),
            )
          : undefined,
        page: canCount ? await countsFor(tab) : undefined,
      });
    }
    const reported =
      connection === 'connected' ? await tell(settings.pairing, context) : connection;
    const missing = (wantsTabs && !granted.tabs) || (capabilities.pageActivity && !granted.pages);
    ports.showBadge(badgeFor({ connection: reported, paused: false, needsPermission: missing }));
  }

  // Whether a page may keep counting; its counts are kept if so.
  async function pageActivity(tabId: number, counts: PageCounts): Promise<boolean> {
    const settings = await ports.settings();
    if (!settings.pairing || settings.paused) return false;
    const { connection, capabilities } = await capabilitiesFor(settings.pairing);
    const allowed =
      connection === 'connected' && capabilities.pageActivity && (await ports.permissions()).pages;
    if (allowed) await ports.savePageCounts({ tabId, at: ports.now(), counts });
    return allowed;
  }

  // Tab switches are only noted while the user lets Mocha know about them.
  async function note(change: (state: ActivityState, now: number) => ActivityState) {
    if (!asked?.capabilities.browserActivity) return;
    const now = ports.now();
    await ports.saveActivity(change((await ports.loadActivity()) ?? freshActivity(now), now));
  }

  return {
    /** Looks at the tab in front again and tells Mocha. */
    update: () => inTurn(update),
    /**
     * Counts from the page-activity script in tab `tabId`. Answers whether
     * it may keep counting; the script stops when told no.
     */
    pageActivity: (tabId: number, counts: PageCounts) => inTurn(() => pageActivity(tabId, counts)),
    /** Another tab came to the front. */
    tabSwitched: () => note(recordSwitch),
    /** The tab in front went to another page. */
    navigated: () => note(recordNavigation),
    /** Asks Mocha again on the next update, after the pairing changed. */
    forgetCapabilities(): void {
      asked = undefined;
      toldNothing = false;
    },
  };
}

export type Companion = ReturnType<typeof createCompanion>;
