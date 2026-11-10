import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { DEFAULT_PREFERENCES } from '../../shared/preferences.ts';
import { registerSettingsHandlers } from './register-settings-handlers.ts';

type Handler = (event: unknown, payload?: unknown) => unknown;
const ipc = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: Handler) => ipc.handlers.set(channel, handler),
  },
}));

const TRUSTED = 'file:///app/out/renderer/settings.html';
const settingsContents = { id: 3 };

describe('registerSettingsHandlers', () => {
  const access = { load: vi.fn(() => DEFAULT_PREFERENCES), save: vi.fn() };
  const logger = { warn: vi.fn() };
  let current: unknown;

  const invoke = (channel: string, sender: unknown, payload?: unknown, url = TRUSTED) =>
    ipc.handlers.get(channel)?.({ sender, senderFrame: { url } }, payload);

  beforeEach(() => {
    ipc.handlers.clear();
    vi.clearAllMocks();
    current = settingsContents;
    registerSettingsHandlers(() => current, access, [TRUSTED], logger);
  });

  it('gives the settings window the current preferences', () => {
    expect(invoke(IpcChannel.SettingsLoad, settingsContents)).toBe(DEFAULT_PREFERENCES);
  });

  it('saves valid preferences', () => {
    const changed = { ...DEFAULT_PREFERENCES, workMinutes: 25 };

    expect(invoke(IpcChannel.SettingsSave, settingsContents, changed)).toBe(true);
    expect(access.save).toHaveBeenCalledWith(changed);
  });

  it.each([
    ['out of range', { ...DEFAULT_PREFERENCES, breakMinutes: 0 }],
    ['the wrong shape', { workMinutes: 'forty' }],
    ['nothing', undefined],
  ])('refuses preferences that are %s', (_case, payload) => {
    expect(invoke(IpcChannel.SettingsSave, settingsContents, payload)).toBe(false);
    expect(access.save).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it.each([IpcChannel.SettingsLoad, IpcChannel.SettingsSave])(
    'answers %s only to the open settings window',
    (channel) => {
      expect(invoke(channel, { id: 1 }, DEFAULT_PREFERENCES)).toBeFalsy();
      current = undefined;
      expect(invoke(channel, settingsContents, DEFAULT_PREFERENCES)).toBeFalsy();
      expect(access.load).not.toHaveBeenCalled();
      expect(access.save).not.toHaveBeenCalled();
    },
  );

  it.each([IpcChannel.SettingsLoad, IpcChannel.SettingsSave])(
    'answers %s only on the settings page',
    (channel) => {
      expect(
        invoke(channel, settingsContents, DEFAULT_PREFERENCES, 'https://example.com/'),
      ).toBeFalsy();
      expect(access.load).not.toHaveBeenCalled();
      expect(access.save).not.toHaveBeenCalled();
    },
  );
});
