import { type BrowserWindow, ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/** The parts of the overlay window these handlers touch. */
export type OverlayTarget = Pick<BrowserWindow, 'webContents' | 'setIgnoreMouseEvents'>;

/**
 * Handlers that control the overlay window. Only the overlay's own page may
 * call them: a trusted URL is not enough, because other windows (such as the
 * Tower later) load the same app and must not toggle the overlay.
 */
export function registerOverlayHandlers(
  overlay: OverlayTarget,
  trustedUrls: readonly string[],
  logger: IpcLogger,
): void {
  const setInteractive = validated(
    IpcChannel.SetOverlayInteractive,
    z.boolean(),
    (interactive) => overlay.setIgnoreMouseEvents(!interactive, { forward: true }),
    { isTrusted: (url) => isTrustedSenderUrl(url, trustedUrls), logger },
  );

  ipcMain.on(IpcChannel.SetOverlayInteractive, (event, payload: unknown) => {
    if (event.sender !== overlay.webContents) {
      logger.warn(`[ipc] ${IpcChannel.SetOverlayInteractive}: rejected sender other than overlay`);
      return;
    }
    setInteractive(senderUrl(event), payload);
  });
}
