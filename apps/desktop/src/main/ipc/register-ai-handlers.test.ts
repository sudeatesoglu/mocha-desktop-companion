import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiView } from '../../shared/ai.ts';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { registerAiHandlers } from './register-ai-handlers.ts';

type Handler = (event: unknown, payload?: unknown) => unknown;
const ipc = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: Handler) => ipc.handlers.set(channel, handler),
  },
}));

const TRUSTED = 'file:///app/out/renderer/settings.html';
const settingsContents = { id: 3 };
const KEY = 'sk-ant-api03-0123456789abcdefghijKLMN';
const VIEW: AiView = {
  provider: 'off',
  localModels: null,
  localModel: null,
  readerModel: null,
  claudeModel: 'claude-haiku-5-5',
  hasClaudeKey: false,
  canStoreKey: true,
  features: { chat: false, chatBrowsing: false, insights: false, comments: false },
};

describe('registerAiHandlers', () => {
  const ai = {
    view: vi.fn(async () => VIEW),
    change: vi.fn(async () => VIEW),
    saveKey: vi.fn(async () => ({ ...VIEW, hasClaudeKey: true })),
    forgetKey: vi.fn(async () => VIEW),
    tryIt: vi.fn(async () => ({ ok: true as const, text: 'Caw!' })),
    forgetEverything: vi.fn(),
  };
  const logger = { warn: vi.fn() };
  const invoke = (
    channel: string,
    payload?: unknown,
    sender: unknown = settingsContents,
    url = TRUSTED,
  ) => ipc.handlers.get(channel)?.({ sender, senderFrame: { url } }, payload);

  beforeEach(() => {
    ipc.handlers.clear();
    vi.clearAllMocks();
    registerAiHandlers(() => settingsContents, ai, [TRUSTED], logger);
  });

  it('shows the AI section and tries the model', async () => {
    expect(await invoke(IpcChannel.SettingsAi)).toBe(VIEW);
    expect(await invoke(IpcChannel.SettingsTryAi)).toEqual({ ok: true, text: 'Caw!' });
  });

  it.each([
    { change: 'provider', provider: 'local' },
    { change: 'localModel', model: 'mistral:7b' },
    { change: 'readerModel', model: 'qwen3.5:4b' },
    { change: 'readerModel', model: null },
    { change: 'claudeModel', model: 'claude-sonnet-5-5' },
    { change: 'feature', feature: 'comments', enabled: true },
  ])('applies the change %j', async (change) => {
    await invoke(IpcChannel.SettingsChangeAi, change);

    expect(ai.change).toHaveBeenCalledWith(change);
  });

  it.each([
    { change: 'provider', provider: 'openai' },
    { change: 'claudeModel', model: 'claude-1' },
    { change: 'feature', feature: 'everything', enabled: true },
    { change: 'feature', feature: 'chat', enabled: true, extra: 1 },
    { change: 'localModel', model: '' },
    { change: 'readerModel' },
    { change: 'readerModel', model: 'x'.repeat(201) },
    'provider',
  ])('refuses %j and answers with the unchanged view', async (change) => {
    expect(await invoke(IpcChannel.SettingsChangeAi, change)).toBe(VIEW);
    expect(ai.change).not.toHaveBeenCalled();
  });

  it('takes a key one way, and never logs a refused one', async () => {
    expect(await invoke(IpcChannel.SettingsSaveClaudeKey, KEY)).toMatchObject({
      hasClaudeKey: true,
    });
    expect(ai.saveKey).toHaveBeenCalledWith(KEY);

    const tooLong = `${KEY}${'x'.repeat(300)}`;
    expect(await invoke(IpcChannel.SettingsSaveClaudeKey, tooLong)).toBe(VIEW);
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(KEY);
  });

  it('forgets everything Mocha remembers, with no data', async () => {
    await invoke(IpcChannel.SettingsForgetEverything);
    await invoke(IpcChannel.SettingsForgetEverything, 'all');

    expect(ai.forgetEverything).toHaveBeenCalledOnce();
  });

  it('forgets the key', async () => {
    await invoke(IpcChannel.SettingsForgetClaudeKey);

    expect(ai.forgetKey).toHaveBeenCalled();
  });

  it.each([
    [IpcChannel.SettingsAi, undefined],
    [IpcChannel.SettingsChangeAi, { change: 'provider', provider: 'claude' }],
    [IpcChannel.SettingsSaveClaudeKey, KEY],
    [IpcChannel.SettingsForgetClaudeKey, undefined],
    [IpcChannel.SettingsTryAi, undefined],
  ])('answers %s only to the open settings window, on its own page', async (channel, payload) => {
    expect(await invoke(channel, payload, { id: 1 })).toBeUndefined();
    await invoke(channel, payload, settingsContents, 'https://evil.example/');

    for (const action of [ai.change, ai.saveKey, ai.forgetKey, ai.tryIt]) {
      expect(action).not.toHaveBeenCalled();
    }
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('refuses data where none is expected', async () => {
    expect(await invoke(IpcChannel.SettingsTryAi, 'now')).toBeUndefined();
    expect(await invoke(IpcChannel.SettingsAi, { all: true })).toBeUndefined();
    expect(ai.tryIt).not.toHaveBeenCalled();
  });
});
