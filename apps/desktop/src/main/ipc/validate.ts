import type { z } from 'zod';

export interface IpcLogger {
  warn(message: string, details?: unknown): void;
}

/**
 * Compares a sender URL with the renderer URLs this app loads.
 *
 * For http(s) (the dev server) the origin must match; for file: the exact
 * file must match, so another local HTML file cannot talk to the main
 * process. Query strings and fragments are ignored.
 */
export function isTrustedSenderUrl(senderUrl: string, trustedUrls: readonly string[]): boolean {
  let sender: URL;
  try {
    sender = new URL(senderUrl);
  } catch {
    return false;
  }
  return trustedUrls.some((trusted) => {
    const expected = new URL(trusted);
    if (sender.protocol !== expected.protocol) return false;
    if (expected.protocol === 'file:') return sender.pathname === expected.pathname;
    return sender.origin === expected.origin;
  });
}

/**
 * Outcome of a validated IPC call. An explicit flag instead of `undefined`,
 * because a handler may legitimately return `undefined` itself.
 */
export type IpcResult<R> = { ok: true; value: R } | { ok: false };

/**
 * Wraps an IPC handler so it only runs for a trusted sender and a payload
 * that matches the schema. Anything else is rejected and logged, never
 * thrown back into the renderer.
 */
export function validated<S extends z.ZodType, R>(
  channel: string,
  schema: S,
  handler: (payload: z.infer<S>) => R,
  options: { isTrusted: (senderUrl: string) => boolean; logger: IpcLogger },
): (senderUrl: string, payload: unknown) => IpcResult<R> {
  return (senderUrl, payload) => {
    if (!options.isTrusted(senderUrl)) {
      options.logger.warn(`[ipc] ${channel}: rejected untrusted sender`, { senderUrl });
      return { ok: false };
    }
    const result = schema.safeParse(payload);
    if (!result.success) {
      options.logger.warn(`[ipc] ${channel}: rejected invalid payload`, result.error.issues);
      return { ok: false };
    }
    return { ok: true, value: handler(result.data) };
  };
}
