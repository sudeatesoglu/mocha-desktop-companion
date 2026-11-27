import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiRequest } from './api-handler.ts';
import {
  type ApiServer,
  MAX_BODY_BYTES,
  MAX_PAGE_BODY_BYTES,
  maxBodyFor,
  startApiServer,
} from './api-server.ts';

/** Sends a raw request and resolves to the status and body. */
function send(
  port: number,
  options: {
    method?: string;
    path?: string;
    body?: string;
    /** Sent in two writes without a length, so the server reads it as a stream. */
    streamed?: boolean;
    headers?: Record<string, string | string[]>;
  },
) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const outgoing = httpRequest(
      {
        host: '127.0.0.1',
        port,
        method: options.method ?? 'GET',
        path: options.path ?? '/v1/health',
        headers: options.headers,
      },
      (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
      },
    );
    outgoing.on('error', reject);
    const body = options.body ?? '';
    if (options.streamed) {
      outgoing.write(body.slice(0, body.length / 2));
      outgoing.end(body.slice(body.length / 2));
    } else {
      outgoing.end(body);
    }
  });
}

describe('startApiServer', () => {
  const logger = { warn: vi.fn() };
  let server: ApiServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
    logger.warn.mockClear();
  });

  it('passes the request to the handler and writes its response', async () => {
    const handle = vi.fn((_request: ApiRequest) => ({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: '{"ok":true}',
    }));
    server = await startApiServer({ port: 0, handle, logger });

    const response = await send(server.port, {
      method: 'POST',
      path: '/v1/context?ignored=1',
      body: '{"kind":"code"}',
      headers: { Origin: 'chrome-extension://x', 'Content-Type': 'application/json' },
    });

    expect(response).toEqual({ status: 200, body: '{"ok":true}' });
    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/v1/context',
        body: '{"kind":"code"}',
        port: server.port,
        headers: expect.objectContaining({
          host: `127.0.0.1:${server.port}`,
          origin: 'chrome-extension://x',
        }),
      }),
    );
  });

  it('listens on 127.0.0.1 only', async () => {
    const handle = () => ({ status: 204, headers: {}, body: '' });
    server = await startApiServer({ port: 0, handle, logger });

    await expect(send(server.port, {})).resolves.toMatchObject({ status: 204 });
    // The same port on another local address finds nothing.
    await expect(
      new Promise((resolve, reject) => {
        const outgoing = httpRequest({ host: '::1', port: server?.port }, resolve);
        outgoing.on('error', reject);
        outgoing.end();
      }),
    ).rejects.toThrow();
  });

  it('logs refusals by reason, never content', async () => {
    const handle = () => ({ status: 403, headers: {}, body: '', refused: 'origin' });
    server = await startApiServer({ port: 0, handle, logger });

    await send(server.port, { method: 'POST', body: '{"title":"secret"}' });

    expect(logger.warn).toHaveBeenCalledWith('[api] refused 403: origin');
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('secret');
  });

  it.each([
    ['declared', false],
    ['streamed', true],
  ])('refuses a body that is too large (%s) without handling it', async (_case, streamed) => {
    const handle = vi.fn(() => ({ status: 204, headers: {}, body: '' }));
    server = await startApiServer({ port: 0, handle, logger });

    const response = await send(server.port, {
      method: 'POST',
      body: 'x'.repeat(MAX_BODY_BYTES * 2),
      streamed,
    }).catch(() => ({ status: 413, body: '' })); // the server may cut the connection

    expect(response.status).toBe(413);
    expect(logger.warn).toHaveBeenCalledWith('[api] refused 413: body too large');
    expect(handle).not.toHaveBeenCalled();
  });

  it('lets only a page through with a larger body, within its own limit', async () => {
    const handle = vi.fn((_request: ApiRequest) => ({ status: 204, headers: {}, body: '' }));
    server = await startApiServer({ port: 0, handle, logger });
    const page = 'x'.repeat(MAX_BODY_BYTES * 4);

    expect(maxBodyFor('/v1/context')).toBe(MAX_BODY_BYTES);
    expect(maxBodyFor('/v1/page')).toBe(MAX_PAGE_BODY_BYTES);
    expect((await send(server.port, { method: 'POST', path: '/v1/page', body: page })).status).toBe(
      204,
    );
    expect(handle.mock.calls[0]?.[0]).toMatchObject({ path: '/v1/page', body: page });
    const tooBig = await send(server.port, {
      method: 'POST',
      path: '/v1/page',
      body: 'x'.repeat(MAX_PAGE_BODY_BYTES + 1),
    }).catch(() => ({ status: 413, body: '' }));
    expect(tooBig.status).toBe(413);
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('joins a header sent more than once', async () => {
    const handle = vi.fn((_request: ApiRequest) => ({ status: 204, headers: {}, body: '' }));
    server = await startApiServer({ port: 0, handle, logger });

    await send(server.port, { headers: { 'Set-Cookie': ['a=1', 'b=2'] } });

    expect(handle.mock.calls[0]?.[0].headers['set-cookie']).toBe('a=1, b=2');
  });

  it('fails to start on a port that cannot exist', async () => {
    await expect(
      startApiServer({
        port: 70_000,
        handle: () => ({ status: 204, headers: {}, body: '' }),
        logger,
      }),
    ).rejects.toThrow();
  });

  it('moves to a free port when its port is taken', async () => {
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
    const taken = (blocker.address() as { port: number }).port;
    try {
      server = await startApiServer({
        port: taken,
        handle: () => ({ status: 204, headers: {}, body: '' }),
        logger,
      });

      expect(server.port).not.toBe(taken);
      await expect(send(server.port, {})).resolves.toMatchObject({ status: 204 });
    } finally {
      await new Promise((resolve) => blocker.close(resolve));
    }
  });

  it('stops listening when closed', async () => {
    server = await startApiServer({
      port: 0,
      handle: () => ({ status: 204, headers: {}, body: '' }),
      logger,
    });
    const { port } = server;
    await server.close();
    server = undefined;

    await expect(send(port, {})).rejects.toThrow();
  });
});
