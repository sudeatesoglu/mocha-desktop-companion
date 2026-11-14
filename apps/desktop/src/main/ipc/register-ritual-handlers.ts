import type { RitualId } from '@mocha/core';
import { type IpcMainEvent, ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/**
 * Accepts the ritual bubble's messages: only from the bubble that is open
 * (`currentSender`), on its own page, and only with the payloads below.
 */
export function registerRitualHandlers(
  currentSender: () => unknown,
  handlers: { ready(): void; start(ritual: RitualId): void; finish(): void; close(): void },
  trustedUrls: readonly string[],
  logger: IpcLogger,
): void {
  const options = { isTrusted: (url: string) => isTrustedSenderUrl(url, trustedUrls), logger };

  /** Registers a listener that accepts messages from the open bubble only. */
  function fromRitual(channel: string, listener: (senderUrl: string, payload: unknown) => unknown) {
    ipcMain.on(channel, (event: IpcMainEvent, payload: unknown) => {
      const expected = currentSender();
      if (expected === undefined || event.sender !== expected) {
        logger.warn(`[ipc] ${channel}: rejected sender other than the ritual bubble`);
        return;
      }
      listener(senderUrl(event), payload);
    });
  }

  const none = z.undefined();
  fromRitual(
    IpcChannel.RitualReady,
    validated(IpcChannel.RitualReady, none, () => handlers.ready(), options),
  );
  fromRitual(
    IpcChannel.RitualStart,
    validated(
      IpcChannel.RitualStart,
      z.enum(['breathe', 'eyes', 'stretch']),
      handlers.start,
      options,
    ),
  );
  fromRitual(
    IpcChannel.RitualFinish,
    validated(IpcChannel.RitualFinish, none, () => handlers.finish(), options),
  );
  fromRitual(
    IpcChannel.RitualClose,
    validated(IpcChannel.RitualClose, none, () => handlers.close(), options),
  );
}
