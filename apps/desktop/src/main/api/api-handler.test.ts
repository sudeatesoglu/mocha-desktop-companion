import {
  type BrowserCapabilities,
  type BrowsingContext,
  MAX_PAGE_TEXT,
  NO_BROWSER_CAPABILITIES,
} from '@mocha/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Api, type ApiRequest, handleApiRequest } from './api-handler.ts';

const PORT = 47213;
const ORIGIN = 'chrome-extension://bklkopgekhoiendfbkifbpmplojpgipp';
const TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

describe('handleApiRequest', () => {
  const report = vi.fn<(context: BrowsingContext) => void>();
  const read = vi.fn<(text: string) => void>();
  const allowRequest = vi.fn<() => boolean>();
  let capabilities: BrowserCapabilities;
  const api: Api = {
    token: TOKEN,
    origin: ORIGIN,
    allowRequest,
    capabilities: () => capabilities,
    report,
    read,
  };

  beforeEach(() => {
    capabilities = { ...NO_BROWSER_CAPABILITIES, kind: true, title: true };
    report.mockReset();
    read.mockReset();
    allowRequest.mockReset().mockReturnValue(true);
  });

  /** A valid request from the paired extension, changed by `patch`. */
  const request = (
    patch: Partial<ApiRequest> = {},
    headers: Record<string, string | undefined> = {},
  ) =>
    handleApiRequest(
      {
        method: 'POST',
        path: '/v1/context',
        port: PORT,
        body: JSON.stringify({ kind: 'code', site: 'github.com', title: 'Pull requests' }),
        ...patch,
        headers: {
          host: `127.0.0.1:${PORT}`,
          origin: ORIGIN,
          authorization: `Bearer ${TOKEN}`,
          'content-type': 'application/json',
          ...headers,
        },
      },
      api,
    );

  it('passes a valid context on, with only what the user allows', () => {
    const response = request();

    expect(response.status).toBe(204);
    expect(response.headers['Access-Control-Allow-Origin']).toBe(ORIGIN);
    expect(report).toHaveBeenCalledWith({ kind: 'code', title: 'Pull requests' });
  });

  describe('a page’s text', () => {
    const page = (body: unknown) =>
      request({ path: '/v1/page', body: typeof body === 'string' ? body : JSON.stringify(body) });

    it('passes it on, scrubbed again, when the user lets Mocha read pages', () => {
      capabilities = { ...capabilities, pageContent: true };

      expect(page({ text: 'Lifetimes  in Rust.\nWrite to me@example.com' }).status).toBe(204);
      expect(read).toHaveBeenCalledWith('Lifetimes in Rust.\nWrite to');
      expect(report).not.toHaveBeenCalled();
    });

    it('refuses it unread unless the user lets Mocha read pages', () => {
      const response = page({ text: 'secret' });
      const unparsed = page('not even JSON');

      expect(response).toMatchObject({ status: 403, refused: 'capability' });
      expect(unparsed).toMatchObject({ status: 403, refused: 'capability' });
      expect(read).not.toHaveBeenCalled();
    });

    it.each([
      ['empty', { text: '' }],
      ['too long', { text: 'x'.repeat(MAX_PAGE_TEXT + 1) }],
      ['with more fields', { text: 'hi', url: 'https://example.com' }],
      ['not text', { text: 42 }],
    ])('refuses a body that is %s', (_, body) => {
      capabilities = { ...capabilities, pageContent: true };

      expect(page(body)).toMatchObject({ status: 400, refused: 'schema' });
      expect(read).not.toHaveBeenCalled();
    });

    it('passes nothing on when nothing is left after scrubbing', () => {
      capabilities = { ...capabilities, pageContent: true };

      expect(page({ text: '1234567890' }).status).toBe(204);
      expect(read).not.toHaveBeenCalled();
    });
  });

  it('answers health and the capabilities as JSON', () => {
    const health = request({ method: 'GET', path: '/v1/health', body: '' });
    const capabilities = request({ method: 'GET', path: '/v1/capabilities', body: '' });

    expect(health.status).toBe(200);
    expect(JSON.parse(health.body)).toEqual({ app: 'mocha', api: 1 });
    expect(JSON.parse(capabilities.body)).toMatchObject({ kind: true, site: false });
    expect(capabilities.headers['Content-Type']).toBe('application/json; charset=utf-8');
  });

  it('answers a preflight for a known route without the token', () => {
    const response = request({ method: 'OPTIONS' }, { authorization: undefined });

    expect(response.status).toBe(204);
    expect(response.headers['Access-Control-Allow-Methods']).toBe('POST');
    expect(response.headers['Access-Control-Allow-Headers']).toBe('Authorization, Content-Type');
  });

  it.each([
    ['another host (DNS rebinding)', {}, { host: `evil.example:${PORT}` }, 403, 'host'],
    ['localhost instead of 127.0.0.1', {}, { host: `localhost:${PORT}` }, 403, 'host'],
    ['the wrong port', {}, { host: '127.0.0.1:1234' }, 403, 'host'],
    ['a web page', {}, { origin: 'https://evil.example' }, 403, 'origin'],
    [
      'another extension',
      {},
      { origin: 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      403,
      'origin',
    ],
    ['no origin (other local software)', {}, { origin: undefined }, 403, 'origin'],
    ['an unknown route', { path: '/v1/keys' }, {}, 404, 'route'],
    ['the wrong method', { method: 'GET' }, {}, 405, 'method'],
    ['no token', {}, { authorization: undefined }, 401, 'token'],
    ['a wrong token', {}, { authorization: 'Bearer ZZZZZZZZZZZZZZZZZZZZZZZZZZ' }, 401, 'token'],
    ['another scheme', {}, { authorization: `Basic ${TOKEN}` }, 401, 'token'],
    ['a prefix of the token', {}, { authorization: 'Bearer ABC' }, 401, 'token'],
    ['another content type', {}, { 'content-type': 'text/plain' }, 415, 'content type'],
    ['no content type', {}, { 'content-type': undefined }, 415, 'content type'],
    ['broken JSON', { body: '{"kind":' }, {}, 400, 'json'],
    [
      'an unknown field',
      { body: JSON.stringify({ url: 'https://bank.example' }) },
      {},
      400,
      'schema',
    ],
    ['an unknown kind', { body: JSON.stringify({ kind: 'banking' }) }, {}, 400, 'schema'],
  ] as const)('refuses %s', (_case, patch, headers, status, reason) => {
    const response = request(patch, headers);

    expect(response.status).toBe(status);
    expect(response.refused).toBe(reason);
    expect(response.body).toBe('');
    expect(report).not.toHaveBeenCalled();
  });

  it('refuses too many requests before looking at the token', () => {
    allowRequest.mockReturnValue(false);

    const response = request({}, { authorization: undefined });

    expect(response.status).toBe(429);
    expect(response.refused).toBe('rate limit');
  });

  it('does not count requests from strangers against the extension', () => {
    request({}, { origin: 'https://evil.example' });

    expect(allowRequest).not.toHaveBeenCalled();
  });

  it('lets the allowed methods be known on a wrong method', () => {
    expect(request({ method: 'DELETE' }).headers['Allow']).toBe('POST');
  });

  it('accepts JSON with a charset', () => {
    expect(request({}, { 'content-type': 'application/json; charset=utf-8' }).status).toBe(204);
  });

  it('never caches and never sniffs', () => {
    const response = request();

    expect(response.headers['Cache-Control']).toBe('no-store');
    expect(response.headers['X-Content-Type-Options']).toBe('nosniff');
  });
});
