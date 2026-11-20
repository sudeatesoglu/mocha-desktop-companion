import {
  type BrowserCapabilities,
  type BrowsingContext,
  filterPage,
  scrubTitle,
} from '@mocha/core';
import type { BrowserStats } from './browser-activity.ts';

/** The tab in front, as Chrome describes it. */
export interface ActiveTab {
  url?: string | undefined;
  title?: string | undefined;
  incognito: boolean;
}

/**
 * What to tell Mocha about the tab in front: only what the user allows, and
 * nothing at all for a page the filter holds back (ADR-0012). `{}` tells
 * Mocha there is nothing to know, so it forgets the page before.
 */
export function pageContext(input: {
  tab: ActiveTab | undefined;
  exclusions: readonly string[];
  capabilities: BrowserCapabilities;
  browser: BrowserStats | undefined;
}): BrowsingContext {
  const { tab, capabilities } = input;
  if (!tab?.url) return {};
  const verdict = filterPage({
    url: tab.url,
    incognito: tab.incognito,
    exclusions: input.exclusions,
  });
  if (!verdict.send) return {};
  const context: { -readonly [K in keyof BrowsingContext]: BrowsingContext[K] } = {};
  if (capabilities.kind) context.kind = verdict.kind;
  if (capabilities.site) context.site = verdict.site;
  if (capabilities.title && verdict.titleAllowed && tab.title) {
    const title = scrubTitle(tab.title);
    if (title) context.title = title;
  }
  if (capabilities.browserActivity && input.browser) context.browser = input.browser;
  return context;
}

/** The capabilities that need to see the tab in front, and so Chrome's `tabs`. */
export const TAB_CAPABILITIES = ['kind', 'site', 'title', 'browserActivity'] as const;

export function needsTabs(capabilities: BrowserCapabilities): boolean {
  return TAB_CAPABILITIES.some((name) => capabilities[name]);
}
