import { z } from 'zod';
import { scrubTitle } from './scrub-title.ts';

/** The kinds of site Mocha tells apart (ADR-0012). */
export const SITE_KINDS = [
  'code',
  'docs',
  'reading',
  'video',
  'music',
  'social',
  'chat',
  'shopping',
  'other',
] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

/**
 * What the user may let Mocha know and do with their browsing, each off
 * until turned on (ADR-0012).
 */
export const BROWSER_CAPABILITIES = [
  'kind', // what kind of site you are on
  'site', // the site's name
  'title', // page titles, scrubbed
  'talk', // comments about what you do
  'nudge', // gentle nudges
  'browserActivity', // sound, tabs, switching, time on a page
  'pageActivity', // typing, scrolling and clicking, as counts
] as const;
export type BrowserCapability = (typeof BROWSER_CAPABILITIES)[number];
export type BrowserCapabilities = Readonly<Record<BrowserCapability, boolean>>;

/** Everything off: what Mocha may do until the user says otherwise. */
export const NO_BROWSER_CAPABILITIES: BrowserCapabilities = Object.freeze({
  kind: false,
  site: false,
  title: false,
  talk: false,
  nudge: false,
  browserActivity: false,
  pageActivity: false,
});

const count = (max: number) => z.int().min(0).max(max);

/**
 * What the extension may report about the active tab. Every part is
 * optional, and every value is bounded: a request is input from outside
 * Mocha and is never trusted (ADR-0011).
 */
export const browsingContextSchema = z.strictObject({
  kind: z.enum(SITE_KINDS).optional(),
  // A domain: lowercase labels and dots, never a path or a query.
  site: z
    .string()
    .max(253)
    .regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/)
    .optional(),
  title: z.string().max(200).optional(),
  browser: z
    .strictObject({
      sound: z.boolean(),
      tabs: count(10_000),
      switchesPerMinute: z.number().min(0).max(1_000),
      secondsOnPage: count(86_400),
    })
    .optional(),
  page: z
    .strictObject({
      keys: count(100_000),
      scrolls: count(100_000),
      clicks: count(100_000),
      windowSeconds: z.int().min(1).max(600),
    })
    .optional(),
});
export type BrowsingContext = z.infer<typeof browsingContextSchema>;

/**
 * `context` with only what the user allows, and the title scrubbed again.
 * Main applies it to everything it receives, so a misbehaving extension
 * cannot widen what Mocha knows (ADR-0012).
 */
export function allowedContext(
  context: BrowsingContext,
  capabilities: BrowserCapabilities,
): BrowsingContext {
  const allowed: { -readonly [K in keyof BrowsingContext]: BrowsingContext[K] } = {};
  if (capabilities.kind && context.kind) allowed.kind = context.kind;
  if (capabilities.site && context.site) allowed.site = context.site;
  if (capabilities.title && context.title) {
    const title = scrubTitle(context.title);
    if (title) allowed.title = title;
  }
  if (capabilities.browserActivity && context.browser) allowed.browser = context.browser;
  if (capabilities.pageActivity && context.page) allowed.page = context.page;
  return allowed;
}
