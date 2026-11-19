import { createHash, timingSafeEqual } from 'node:crypto';
import {
  allowedContext,
  type BrowserCapabilities,
  type BrowsingContext,
  browsingContextSchema,
} from '@mocha/core';

/** A request, as the server reads it. */
export interface ApiRequest {
  method: string;
  /** The path without the query. */
  path: string;
  /** Lowercase header names. */
  headers: Readonly<Record<string, string | undefined>>;
  body: string;
  /** The port the server listens on. */
  port: number;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  /** Why a request was refused, for the log; never request content. */
  refused?: string;
}

/** What the handler needs from the app. */
export interface Api {
  /** The pairing token every request must carry. */
  token: string;
  /** The extension's origin, the only one allowed. */
  origin: string;
  /** Rate limit: false when there were too many requests. */
  allowRequest(): boolean;
  capabilities(): BrowserCapabilities;
  /** A context that passed every check, with only what the user allows. */
  report(context: BrowsingContext): void;
}

const ROUTES: Readonly<Record<string, readonly string[]>> = {
  '/v1/health': ['GET'],
  '/v1/capabilities': ['GET'],
  '/v1/context': ['POST'],
};

const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const sha256 = (text: string) => createHash('sha256').update(text).digest();

/** Compares the bearer token in constant time, so timing reveals nothing. */
function carriesToken(authorization: string | undefined, token: string): boolean {
  const match = /^Bearer (\S+)$/.exec(authorization ?? '');
  return match?.[1] !== undefined && timingSafeEqual(sha256(match[1]), sha256(token));
}

/**
 * The local API as a pure function of the request (ADR-0011). Every check
 * comes before any work, in order: who may ask (Host, Origin), how often,
 * what is asked (route, method), the token, then the content.
 */
export function handleApiRequest(request: ApiRequest, api: Api): ApiResponse {
  const respond = (status: number, extra: Record<string, string> = {}, body = '') => ({
    status,
    headers: { ...BASE_HEADERS, ...extra },
    body,
  });
  const refuse = (status: number, reason: string, extra: Record<string, string> = {}) => ({
    ...respond(status, extra),
    refused: reason,
  });

  // A page that rebinds its own domain to 127.0.0.1 still sends its own Host.
  if (request.headers['host'] !== `127.0.0.1:${request.port}`) return refuse(403, 'host');
  // Browsers set Origin and pages cannot fake it: only our extension.
  if (request.headers['origin'] !== api.origin) return refuse(403, 'origin');

  const cors = { 'Access-Control-Allow-Origin': api.origin, Vary: 'Origin' };
  if (!api.allowRequest()) return refuse(429, 'rate limit', cors);

  const methods = ROUTES[request.path];
  if (!methods) return refuse(404, 'route', cors);
  if (request.method === 'OPTIONS') {
    return respond(204, {
      ...cors,
      'Access-Control-Allow-Methods': methods.join(', '),
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '600',
    });
  }
  if (!methods.includes(request.method)) {
    return refuse(405, 'method', { ...cors, Allow: methods.join(', ') });
  }
  // The token keeps out other local software, which can fake any header.
  if (!carriesToken(request.headers['authorization'], api.token)) return refuse(401, 'token', cors);

  const json = (body: unknown) =>
    respond(
      200,
      { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
      JSON.stringify(body),
    );
  if (request.path === '/v1/health') return json({ app: 'mocha', api: 1 });
  if (request.path === '/v1/capabilities') return json(api.capabilities());

  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) {
    return refuse(415, 'content type', cors);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(request.body);
  } catch {
    return refuse(400, 'json', cors);
  }
  const parsed = browsingContextSchema.safeParse(payload);
  if (!parsed.success) return refuse(400, 'schema', cors);
  api.report(allowedContext(parsed.data, api.capabilities()));
  return respond(204, cors);
}
