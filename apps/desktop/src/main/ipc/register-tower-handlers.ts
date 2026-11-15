import { type IpcMainEvent, ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import type { FocusMinutes, TowerAction } from '../../shared/tower.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/**
 * Accepts the user's care for Mocha from the Tower: only from the Tower
 * window that is open (`currentSender`), on its own page, and only as one
 * of the known actions. What an action does is decided in main.
 */
export function registerTowerHandlers(
  currentSender: () => unknown,
  handlers: {
    ready(): void;
    act(action: TowerAction): void;
    focus(minutes: FocusMinutes | null): void;
  },
  trustedUrls: readonly string[],
  logger: IpcLogger,
): void {
  const options = { isTrusted: (url: string) => isTrustedSenderUrl(url, trustedUrls), logger };

  /** Registers a listener that accepts messages from the open Tower only. */
  function fromTower(channel: string, listener: (senderUrl: string, payload: unknown) => unknown) {
    ipcMain.on(channel, (event: IpcMainEvent, payload: unknown) => {
      const expected = currentSender();
      if (expected === undefined || event.sender !== expected) {
        logger.warn(`[ipc] ${channel}: rejected sender other than the Tower`);
        return;
      }
      listener(senderUrl(event), payload);
    });
  }

  fromTower(
    IpcChannel.TowerReady,
    validated(IpcChannel.TowerReady, z.undefined(), () => handlers.ready(), options),
  );
  // Only the offered lengths: a page cannot ask for a session of any length.
  fromTower(
    IpcChannel.TowerFocus,
    validated(
      IpcChannel.TowerFocus,
      z.union([z.literal(25), z.literal(40), z.literal(50), z.null()]),
      handlers.focus,
      options,
    ),
  );
  fromTower(
    IpcChannel.TowerAct,
    validated(
      IpcChannel.TowerAct,
      z.enum(['pet', 'treat', 'rest', 'endBreak']),
      handlers.act,
      options,
    ),
  );
}
