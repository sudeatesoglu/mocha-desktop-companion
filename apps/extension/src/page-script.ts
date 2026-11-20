import { browsingContextSchema, SENSITIVE_DOMAINS } from '@mocha/core';
import { z } from 'zod';
import { WINDOW_SECONDS } from './activity-counter.ts';

/** The page-activity script's ID, for registering and removing it. */
export const PAGE_SCRIPT_ID = 'page-activity';

/**
 * What Chrome asks for page activity (capability 7). Only https pages: this
 * keeps http://127.0.0.1, where Mocha listens, out of the extension's host
 * access, so Chrome keeps sending Mocha the extension's Origin.
 */
export const PAGE_PERMISSIONS = {
  // A literal type, so Chrome's API takes it as one of its permission names.
  permissions: ['scripting' as const],
  origins: ['https://*/*'],
};

/**
 * The page-activity script, registered only while the user allows it. It
 * does not even run on the listed sensitive sites; counts from any other
 * page the filter holds back are dropped by the worker (ADR-0012).
 */
export const PAGE_SCRIPT = {
  id: PAGE_SCRIPT_ID,
  js: ['page-activity.js'],
  matches: ['https://*/*'],
  excludeMatches: [...new Set(Object.values(SENSITIVE_DOMAINS).flat())].map(
    (domain) => `https://*.${domain}/*`,
  ),
  runAt: 'document_idle' as const,
  allFrames: false,
  persistAcrossSessions: true,
};

// The same bounds Mocha checks: counts the API would refuse are refused here.
const countsSchema = browsingContextSchema.shape.page.unwrap();

/** A message from the page-activity script, never trusted (ADR-0011). */
export const pageActivityMessageSchema = z.strictObject({
  type: z.literal('page-activity'),
  counts: countsSchema,
});

const savedCountsSchema = z.strictObject({
  tabId: z.int(),
  at: z.number(),
  counts: countsSchema,
});

/** The latest counts as kept in Chrome's session storage, if readable. */
export function parseSavedCounts(value: unknown): z.infer<typeof savedCountsSchema> | undefined {
  const parsed = savedCountsSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Counts older than two windows are no longer what the user is doing. */
export const COUNTS_TTL_MS = 2 * WINDOW_SECONDS * 1_000;
