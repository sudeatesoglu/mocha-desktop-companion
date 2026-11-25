import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { registerChatHandlers } from './register-chat-handlers.ts';

type Handler = (event: unknown, payload?: unknown) => unknown;
const ipc = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: Handler) => ipc.handlers.set(channel, handler),
  },
}));

const TRUSTED = 'file:///app/out/renderer/tower.html';
const MEMORIES = [{ id: 1, text: 'Is learning Rust', pinned: false }];

describe('registerChatHandlers', () => {
  const tower = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
  let release: () => void = () => {};
  const chat = {
    view: vi.fn(() => ({ available: true, entries: [], learned: [] })),
    send: vi.fn(async (_message: string, onText: (piece: string) => void) => {
      onText('Caw');
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { ok: true as const, text: 'Caw!' };
    }),
    memories: vi.fn(() => MEMORIES),
    edit: vi.fn(() => true),
    pin: vi.fn(() => MEMORIES),
    forget: vi.fn(() => []),
    forgetEverything: vi.fn(),
  };
  const logger = { warn: vi.fn() };
  const invoke = (channel: string, payload?: unknown, sender: unknown = tower, url = TRUSTED) =>
    ipc.handlers.get(channel)?.({ sender, senderFrame: { url } }, payload);

  beforeEach(() => {
    ipc.handlers.clear();
    vi.clearAllMocks();
    registerChatHandlers(() => tower, chat, [TRUSTED], logger);
  });

  it('opens the chat and lists memories', () => {
    expect(invoke(IpcChannel.TowerChat)).toEqual({ available: true, entries: [], learned: [] });
    expect(invoke(IpcChannel.TowerMemories)).toBe(MEMORIES);
  });

  it('streams the answer to the Tower, and answers one message at a time', async () => {
    const first = invoke(IpcChannel.TowerChatSend, 'hi') as Promise<unknown>;
    expect(await invoke(IpcChannel.TowerChatSend, 'again')).toEqual({ ok: false, problem: 'busy' });
    release();

    expect(await first).toEqual({ ok: true, text: 'Caw!' });
    expect(tower.send).toHaveBeenCalledWith(IpcChannel.TowerChatText, 'Caw');
    const next = invoke(IpcChannel.TowerChatSend, 'third') as Promise<unknown>;
    release();
    expect(await next).toEqual({ ok: true, text: 'Caw!' });
  });

  it('sends no pieces to a closed Tower', async () => {
    tower.isDestroyed.mockReturnValueOnce(true);
    const reply = invoke(IpcChannel.TowerChatSend, 'hi') as Promise<unknown>;
    release();
    await reply;

    expect(tower.send).not.toHaveBeenCalled();
  });

  it('edits, pins and forgets one memory, and forgets everything', () => {
    expect(invoke(IpcChannel.TowerEditMemory, { id: 1, text: 'Is learning Go' })).toBe(true);
    expect(invoke(IpcChannel.TowerPinMemory, { id: 1, pinned: true })).toBe(MEMORIES);
    expect(invoke(IpcChannel.TowerForgetMemory, 1)).toEqual([]);
    invoke(IpcChannel.TowerForgetEverything);

    expect(chat.edit).toHaveBeenCalledWith(1, 'Is learning Go');
    expect(chat.pin).toHaveBeenCalledWith(1, true);
    expect(chat.forget).toHaveBeenCalledWith(1);
    expect(chat.forgetEverything).toHaveBeenCalled();
  });

  it.each([
    [IpcChannel.TowerChatSend, '', { ok: false, problem: 'unavailable' }],
    [IpcChannel.TowerChatSend, 'x'.repeat(2_001), { ok: false, problem: 'unavailable' }],
    [IpcChannel.TowerEditMemory, { id: 1, text: 'x'.repeat(501) }, false],
    [IpcChannel.TowerEditMemory, { id: 0, text: 'ok' }, false],
    [IpcChannel.TowerPinMemory, { id: 1, pinned: 'yes' }, undefined],
    [IpcChannel.TowerForgetMemory, '1', undefined],
    [IpcChannel.TowerForgetEverything, 'now', undefined],
  ])('refuses a wrong payload on %s', async (channel, payload, answer) => {
    expect(await invoke(channel, payload)).toEqual(answer);
    for (const action of [chat.send, chat.edit, chat.pin, chat.forget, chat.forgetEverything]) {
      expect(action).not.toHaveBeenCalled();
    }
  });

  it.each([
    [IpcChannel.TowerChat, undefined],
    [IpcChannel.TowerChatSend, 'hi'],
    [IpcChannel.TowerMemories, undefined],
    [IpcChannel.TowerEditMemory, { id: 1, text: 'x' }],
    [IpcChannel.TowerPinMemory, { id: 1, pinned: true }],
    [IpcChannel.TowerForgetMemory, 1],
    [IpcChannel.TowerForgetEverything, undefined],
  ])('answers %s only to the open Tower, on its own page', async (channel, payload) => {
    expect(await invoke(channel, payload, { id: 9 })).toBeUndefined();
    await invoke(channel, payload, tower, 'https://evil.example/');

    for (const action of [
      chat.view,
      chat.send,
      chat.memories,
      chat.edit,
      chat.pin,
      chat.forget,
      chat.forgetEverything,
    ]) {
      expect(action).not.toHaveBeenCalled();
    }
  });
});
