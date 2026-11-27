import { NO_BROWSER_CAPABILITIES } from '@mocha/core';
import { describe, expect, it, vi } from 'vitest';
import { createMochaClient } from './mocha-client.ts';

const PAIRING = { port: 47213, token: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };
const ALL_ON = { ...NO_BROWSER_CAPABILITIES, kind: true, title: true };

const answer = (status: number, body?: unknown) =>
  vi.fn(async () =>
    body === undefined
      ? new Response(null, { status })
      : new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  );

describe('createMochaClient', () => {
  it('calls Mocha on this computer, at the pairing port, with the token', async () => {
    const fetch = answer(200, ALL_ON);

    expect((await createMochaClient(fetch).capabilities(PAIRING)).connection).toBe('connected');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:47213/v1/capabilities',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
        body: null,
        credentials: 'omit',
        redirect: 'error',
      }),
    );
  });

  it('asks nothing before it is paired', async () => {
    const fetch = answer(200, {});
    const client = createMochaClient(fetch);

    expect((await client.capabilities(undefined)).connection).toBe('not paired');
    expect(await client.report(undefined, {})).toBe('not paired');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('tells apart why Mocha cannot be reached', async () => {
    const refused = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    const connection = async (fetch: Parameters<typeof createMochaClient>[0]) =>
      (await createMochaClient(fetch).capabilities(PAIRING)).connection;

    expect(await connection(refused)).toBe('not running');
    expect(await connection(answer(401))).toBe('wrong code');
    expect(await connection(answer(429))).toBe('busy');
    expect(await connection(answer(403))).toBe('unexpected');
  });

  it('does not take another program for Mocha', async () => {
    for (const body of [{ app: 'other' }, '<html>']) {
      expect(await createMochaClient(answer(200, body)).capabilities(PAIRING)).toEqual({
        connection: 'unexpected',
        capabilities: NO_BROWSER_CAPABILITIES,
      });
    }
  });

  it('reads what Mocha may know', async () => {
    expect(await createMochaClient(answer(200, ALL_ON)).capabilities(PAIRING)).toEqual({
      connection: 'connected',
      capabilities: ALL_ON,
    });
  });

  it('assumes nothing is allowed when the answer is wrong or missing', async () => {
    expect(await createMochaClient(answer(200, { kind: 'yes' })).capabilities(PAIRING)).toEqual({
      connection: 'unexpected',
      capabilities: NO_BROWSER_CAPABILITIES,
    });
    expect(await createMochaClient(answer(401)).capabilities(PAIRING)).toEqual({
      connection: 'wrong code',
      capabilities: NO_BROWSER_CAPABILITIES,
    });
  });

  it('reports the context as JSON', async () => {
    const fetch = answer(204);

    expect(await createMochaClient(fetch).report(PAIRING, { kind: 'code' })).toBe('connected');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:47213/v1/context',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ',
          'Content-Type': 'application/json',
        },
        body: '{"kind":"code"}',
      }),
    );
  });

  it('hands Mocha a page’s text as JSON, and says when it was refused', async () => {
    const fetch = answer(204);

    expect(await createMochaClient(fetch).read(PAIRING, { text: 'Lifetimes' })).toBe('connected');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:47213/v1/page',
      expect.objectContaining({ method: 'POST', body: '{"text":"Lifetimes"}' }),
    );
    expect(await createMochaClient(answer(403)).read(PAIRING, { text: 'x' })).toBe('unexpected');
  });
});
