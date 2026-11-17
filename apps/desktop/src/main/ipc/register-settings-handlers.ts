import { type IpcMainInvokeEvent, ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import type { LoginItem } from '../../shared/login-item.ts';
import { type Preferences, preferencesSchema } from '../../shared/preferences.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

export interface PreferencesAccess {
  load(): Preferences;
  /** Stores and applies preferences that already passed validation. */
  save(preferences: Preferences): void;
}

export interface LoginItemAccess {
  get(): LoginItem;
  /** Asks the system to open Mocha at login or not, and reads the result. */
  set(open: boolean): LoginItem;
}

export interface SoundsAccess {
  get(): boolean;
  /** Turns sounds on or off, keeps the choice and returns it. */
  set(enabled: boolean): boolean;
}

/**
 * Lets the settings window read and change the preferences. Only the open
 * settings window (`currentSender`) on its own page may call these, and a
 * save must pass the same schema the form uses.
 */
export function registerSettingsHandlers(
  currentSender: () => unknown,
  {
    preferences,
    loginItem,
    sounds,
  }: { preferences: PreferencesAccess; loginItem: LoginItemAccess; sounds: SoundsAccess },
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

  ipcMain.handle(IpcChannel.SettingsLoginItem, (event) =>
    fromSettings(IpcChannel.SettingsLoginItem, event) ? loginItem.get() : undefined,
  );
  // Only a boolean: a page cannot pass options such as another app's path.
  const setOpenAtLogin = validated(IpcChannel.SettingsOpenAtLogin, z.boolean(), loginItem.set, {
    isTrusted,
    logger,
  });
  ipcMain.handle(IpcChannel.SettingsOpenAtLogin, (event, payload: unknown) => {
    if (!fromSettings(IpcChannel.SettingsOpenAtLogin, event)) return undefined;
    const result = setOpenAtLogin(senderUrl(event), payload);
    return result.ok ? result.value : loginItem.get();
  });

  ipcMain.handle(IpcChannel.SettingsSounds, (event) =>
    fromSettings(IpcChannel.SettingsSounds, event) ? sounds.get() : undefined,
  );
  const setSounds = validated(IpcChannel.SettingsSetSounds, z.boolean(), sounds.set, {
    isTrusted,
    logger,
  });
  ipcMain.handle(IpcChannel.SettingsSetSounds, (event, payload: unknown) => {
    if (!fromSettings(IpcChannel.SettingsSetSounds, event)) return undefined;
    const result = setSounds(senderUrl(event), payload);
    return result.ok ? result.value : sounds.get();
  });
}
