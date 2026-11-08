import { type IpcMainEvent, ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import type { ReminderChoice } from '../../shared/reminder.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/**
 * Accepts the user's answer to a break reminder, only from the reminder
 * window that is currently open (`currentSender`) and only as one of the
 * three known choices.
 */
export function registerReminderHandlers(
  currentSender: () => unknown,
  onChoice: (choice: ReminderChoice) => void,
  trustedUrls: readonly string[],
  logger: IpcLogger,
): void {
  const choose = validated(
    IpcChannel.ReminderChoose,
    z.enum(['accept', 'snooze', 'dismiss']),
    onChoice,
    { isTrusted: (url) => isTrustedSenderUrl(url, trustedUrls), logger },
  );

  ipcMain.on(IpcChannel.ReminderChoose, (event: IpcMainEvent, payload: unknown) => {
    const expected = currentSender();
    if (expected === undefined || event.sender !== expected) {
      logger.warn(`[ipc] ${IpcChannel.ReminderChoose}: rejected sender other than the reminder`);
      return;
    }
    choose(senderUrl(event), payload);
  });
}
