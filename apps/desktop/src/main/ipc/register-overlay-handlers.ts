import { type BrowserWindow, type IpcMainEvent, ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import type { WindowDragger } from '../windows/window-dragger.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/** The parts of the overlay window these handlers touch. */
export type OverlayTarget = Pick<BrowserWindow, 'webContents' | 'setIgnoreMouseEvents'>;

/**
 * Handlers that control the overlay window. Only the overlay's own page may
 * call them: a trusted URL is not enough, because other windows (such as the
 * Tower later) load the same app and must not move or toggle the overlay.
 */
export function registerOverlayHandlers(
  overlay: OverlayTarget,
  dragger: Pick<WindowDragger, 'start' | 'end'>,
  requests: { openTower(): void; petted(): void },
  trustedUrls: readonly string[],
  logger: IpcLogger,
): void {
  const options = { isTrusted: (url: string) => isTrustedSenderUrl(url, trustedUrls), logger };

  /** Registers a listener that accepts messages from the overlay page only. */
  function fromOverlay(
    channel: string,
    listener: (senderUrl: string, payload: unknown) => unknown,
  ): void {
    ipcMain.on(channel, (event: IpcMainEvent, payload: unknown) => {
      if (event.sender !== overlay.webContents) {
        logger.warn(`[ipc] ${channel}: rejected sender other than overlay`);
        return;
      }
      listener(senderUrl(event), payload);
    });
  }

  fromOverlay(
    IpcChannel.SetOverlayInteractive,
    validated(
      IpcChannel.SetOverlayInteractive,
      z.boolean(),
      (interactive) => overlay.setIgnoreMouseEvents(!interactive, { forward: true }),
      options,
    ),
  );

  fromOverlay(
    IpcChannel.DragOverlay,
    validated(
      IpcChannel.DragOverlay,
      z.enum(['start', 'end']),
      (phase) => (phase === 'start' ? dragger.start() : dragger.end()),
      options,
    ),
  );

  // No payload: the overlay can only ask, not say what to open.
  fromOverlay(
    IpcChannel.OpenTower,
    validated(IpcChannel.OpenTower, z.undefined(), () => requests.openTower(), options),
  );

  // No payload either: how much a pet counts is decided here (ADR-0008).
  fromOverlay(
    IpcChannel.OverlayPetted,
    validated(IpcChannel.OverlayPetted, z.undefined(), () => requests.petted(), options),
  );
}
