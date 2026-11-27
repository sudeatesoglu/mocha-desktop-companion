import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ApiRequest, ApiResponse } from './api-handler.ts';

/** Requests are a few hundred bytes; anything bigger is refused unread. */
export const MAX_BODY_BYTES = 4_096;
/**
 * A page's text: at most 20,000 characters, up to four bytes each in
 * UTF-8, and JSON's quoting (ADR-0014).
 */
export const MAX_PAGE_BODY_BYTES = 96 * 1_024;

/** The most a body may hold on `path`. */
export const maxBodyFor = (path: string) =>
  path === '/v1/page' ? MAX_PAGE_BODY_BYTES : MAX_BODY_BYTES;
/** Loopback only: no other machine can reach the API (ADR-0011). */
const HOST = '127.0.0.1';

export interface ApiServer {
  /** The port it really listens on. */
  readonly port: number;
  close(): Promise<void>;
}

const headersOf = (request: IncomingMessage) =>
  Object.fromEntries(
    Object.entries(request.headers).map(([name, value]) => [
      name,
      Array.isArray(value) ? value.join(', ') : value,
    ]),
  );

/**
 * Serves the local API on 127.0.0.1 at `port`, or on a free port when it
 * is taken. A thin shell around `handle`: it reads at most the route's limit,
 * gives up on slow clients and logs refusals by reason, never content.
 */
export function startApiServer(options: {
  port: number;
  handle(request: ApiRequest): ApiResponse;
  logger: { warn(message: string): void };
}): Promise<ApiServer> {
  const server = createServer((request, response) => {
    const send = ({ status, headers, body }: Omit<ApiResponse, 'refused'>) => {
      response.writeHead(status, headers).end(body);
    };
    const port = (server.address() as AddressInfo).port;
    // Always set on a server's request; the type is shared with client responses.
    const path = new URL(request.url as string, `http://${HOST}`).pathname;
    const maxBytes = maxBodyFor(path);
    const declared = Number(request.headers['content-length'] ?? 0);
    if (declared > maxBytes) {
      options.logger.warn('[api] refused 413: body too large');
      send({ status: 413, headers: { Connection: 'close' }, body: '' });
      request.destroy();
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        options.logger.warn('[api] refused 413: body too large');
        send({ status: 413, headers: { Connection: 'close' }, body: '' });
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    // A refused body destroys the request, so it never reaches 'end'.
    request.on('end', () => {
      const result = options.handle({
        method: request.method as string,
        path,
        headers: headersOf(request),
        body: Buffer.concat(chunks).toString('utf8'),
        port,
      });
      if (result.refused) options.logger.warn(`[api] refused ${result.status}: ${result.refused}`);
      send(result);
    });
  });
  // Slow or idle clients cannot hold the server.
  server.headersTimeout = 5_000;
  server.requestTimeout = 5_000;
  server.keepAliveTimeout = 1_000;

  const listen = (port: number) =>
    new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, HOST, () => {
        server.off('error', reject);
        resolve();
      });
    });

  return listen(options.port)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EADDRINUSE') throw error;
      return listen(0); // taken: the pairing code carries the new port
    })
    .then(() => ({
      port: (server.address() as AddressInfo).port,
      close: () =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    }));
}
