import type { BrowserCapabilities, BrowsingContext } from '@mocha/core';
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
import type { ExtensionSettings, Pairing } from './settings.ts';

/** What Mocha allows is asked again after this long. */
export const CAPABILITIES_TTL_MS = 60_000;

/** What the companion needs from Chrome, so tests can fake it. */
export interface CompanionPorts {
  settings(): Promise<ExtensionSettings>;
  client: MochaClient;
  /** Whether Chrome lets the extension see the tab in front (`tabs`). */
  canSeeTabs(): Promise<boolean>;
  /** The tab in front, or undefined when the browser is not in front. */
  activeTab(): Promise<ActiveTab | undefined>;
  /** Open tabs outside private windows, and whether one plays sound. */
  tabs(): Promise<{ count: number; sound: boolean }>;
  loadActivity(): Promise<ActivityState | undefined>;
  saveActivity(state: ActivityState | undefined): Promise<void>;
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
  // One update at a time, in order.
  let queue = Promise.resolve();

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
      if (!toldNothing) await tell(settings.pairing, {});
      ports.showBadge(badgeFor({ connection: 'connected', paused: true, needsPermission: false }));
      return;
    }
    const { connection, capabilities } = await capabilitiesFor(settings.pairing);
    if (!capabilities.browserActivity) await ports.saveActivity(undefined);
    const wantsTabs = needsTabs(capabilities);
    const canSee = wantsTabs && (await ports.canSeeTabs());
    let context: BrowsingContext = {};
    if (connection === 'connected' && canSee) {
      const browser = capabilities.browserActivity
        ? browserStats(
            (await ports.loadActivity()) ?? freshActivity(ports.now()),
            ports.now(),
            await ports.tabs(),
          )
        : undefined;
      context = pageContext({
        tab: await ports.activeTab(),
        exclusions: settings.exclusions,
        capabilities,
        browser,
      });
    }
    const reported =
      connection === 'connected' ? await tell(settings.pairing, context) : connection;
    ports.showBadge(
      badgeFor({ connection: reported, paused: false, needsPermission: wantsTabs && !canSee }),
    );
  }

  // Tab switches are only noted while the user lets Mocha know about them.
  async function note(change: (state: ActivityState, now: number) => ActivityState) {
    if (!asked?.capabilities.browserActivity) return;
    const now = ports.now();
    await ports.saveActivity(change((await ports.loadActivity()) ?? freshActivity(now), now));
  }

  return {
    /** Looks at the tab in front again and tells Mocha. */
    update(): Promise<void> {
      queue = queue.then(update, update);
      return queue;
    },
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
