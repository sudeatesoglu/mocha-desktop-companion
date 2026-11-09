import { type IpcMainInvokeEvent, ipcMain } from 'electron';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { type Preferences, preferencesSchema } from '../../shared/preferences.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

export interface PreferencesAccess {
  load(): Preferences;
  /** Stores and applies preferences that already passed validation. */
  save(preferences: Preferences): void;
}

/**
 * Lets the settings window read and change the preferences. Only the open
 * settings window (`currentSender`) on its own page may call these, and a
 * save must pass the same schema the form uses.
 */
export function registerSettingsHandlers(
  currentSender: () => unknown,
  preferences: PreferencesAccess,
  trustedUrls: readonly string[],
  logger: IpcLogger,
): void {
  const isTrusted = (url: string) => isTrustedSenderUrl(url, trustedUrls);

  function fromSettings(channel: string, event: IpcMainInvokeEvent): boolean {
    const expected = currentSender();
    if (expected === undefined || event.sender !== expected) {
      logger.warn(`[ipc] ${channel}: rejected sender other than the settings window`);
      return false;
    }
    if (!isTrusted(senderUrl(event))) {
      logger.warn(`[ipc] ${channel}: rejected untrusted sender`, { senderUrl: senderUrl(event) });
      return false;
    }
    return true;
  }

  ipcMain.handle(IpcChannel.SettingsLoad, (event) =>
    fromSettings(IpcChannel.SettingsLoad, event) ? preferences.load() : undefined,
  );

  const save = validated(IpcChannel.SettingsSave, preferencesSchema, preferences.save, {
    isTrusted,
    logger,
  });
  ipcMain.handle(IpcChannel.SettingsSave, (event, payload: unknown) => {
    if (!fromSettings(IpcChannel.SettingsSave, event)) return false;
    return save(senderUrl(event), payload).ok;
  });
}
