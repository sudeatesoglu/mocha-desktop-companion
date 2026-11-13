import { type IpcMainEvent, ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import type { TowerAction } from '../../shared/tower.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/**
 * Accepts the user's care for Mocha from the Tower: only from the Tower
 * window that is open (`currentSender`), on its own page, and only as one
 * of the known actions. What an action does is decided in main.
 */
export function registerTowerHandlers(
  currentSender: () => unknown,
  onAction: (action: TowerAction) => void,
  trustedUrls: readonly string[],
  logger: IpcLogger,
): void {
  const act = validated(IpcChannel.TowerAct, z.enum(['pet', 'treat', 'rest']), onAction, {
    isTrusted: (url) => isTrustedSenderUrl(url, trustedUrls),
    logger,
  });

  ipcMain.on(IpcChannel.TowerAct, (event: IpcMainEvent, payload: unknown) => {
    const expected = currentSender();
    if (expected === undefined || event.sender !== expected) {
      logger.warn(`[ipc] ${IpcChannel.TowerAct}: rejected sender other than the Tower`);
      return;
    }
    act(senderUrl(event), payload);
  });
}
