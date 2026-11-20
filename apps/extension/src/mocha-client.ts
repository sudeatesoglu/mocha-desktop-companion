import {
  BROWSER_CAPABILITIES,
  type BrowserCapabilities,
  type BrowsingContext,
  NO_BROWSER_CAPABILITIES,
} from '@mocha/core';
import { z } from 'zod';
import type { Pairing } from './settings.ts';

/** How the link to Mocha stands, for the options page and the toolbar badge. */
export type Connection =
  | 'connected'
  | 'not paired'
  // Nothing listens: Mocha is not running, or the extension is not allowed.
  | 'not running'
  | 'wrong code'
  | 'busy'
  // Something answered that is not Mocha's API.
  | 'unexpected';

/** Mocha answers at once; anything slower is not Mocha. */
const TIMEOUT_MS = 3_000;

const capabilitiesSchema = z.object(
  Object.fromEntries(BROWSER_CAPABILITIES.map((name) => [name, z.boolean()])) as Record<
    keyof BrowserCapabilities,
    z.ZodBoolean
  >,
);

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** Mocha's local API (ADR-0011), as the extension uses it. */
export function createMochaClient(fetchFn: Fetch) {
  async function call(
    pairing: Pairing | undefined,
    method: 'GET' | 'POST',
    path: string,
    body?: BrowsingContext,
  ): Promise<{ connection: Connection; json?: unknown }> {
    if (!pairing) return { connection: 'not paired' };
    let response: Response;
    try {
      response = await fetchFn(`http://127.0.0.1:${pairing.port}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${pairing.token}`,
          ...(body && { 'Content-Type': 'application/json' }),
        },
        body: body ? JSON.stringify(body) : null,
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return { connection: 'not running' };
    }
    if (response.status === 401) return { connection: 'wrong code' };
    if (response.status === 429) return { connection: 'busy' };
    if (!response.ok) return { connection: 'unexpected' };
    if (response.status === 204) return { connection: 'connected' };
    try {
      return { connection: 'connected', json: await response.json() };
    } catch {
      return { connection: 'unexpected' };
    }
  }

  return {
    /**
     * What the user lets Mocha know, which also tells whether Mocha answers
     * with this pairing. Nothing is allowed when Mocha cannot be asked.
     */
    async capabilities(
      pairing: Pairing | undefined,
    ): Promise<{ connection: Connection; capabilities: BrowserCapabilities }> {
      const { connection, json } = await call(pairing, 'GET', '/v1/capabilities');
      const parsed = capabilitiesSchema.safeParse(json);
      if (connection !== 'connected') return { connection, capabilities: NO_BROWSER_CAPABILITIES };
      if (!parsed.success) {
        return { connection: 'unexpected', capabilities: NO_BROWSER_CAPABILITIES };
      }
      return { connection, capabilities: parsed.data };
    },

    /** Tells Mocha about the active tab; `{}` makes it forget at once. */
    async report(pairing: Pairing | undefined, context: BrowsingContext): Promise<Connection> {
      return (await call(pairing, 'POST', '/v1/context', context)).connection;
    },
  };
}

export type MochaClient = ReturnType<typeof createMochaClient>;
