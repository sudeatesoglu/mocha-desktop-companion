import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { registerRitualHandlers } from './register-ritual-handlers.ts';

type Handler = (event: unknown, payload?: unknown) => unknown;
const ipc = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));
vi.mock('electron', () => ({
  ipcMain: { on: (channel: string, handler: Handler) => ipc.handlers.set(channel, handler) },
}));

const TRUSTED = 'file:///app/out/renderer/ritual.html';
const bubble = { id: 9 };

describe('registerRitualHandlers', () => {
  const handlers = { ready: vi.fn(), start: vi.fn(), finish: vi.fn(), close: vi.fn() };
  const logger = { warn: vi.fn() };
  let current: unknown;

  const send = (channel: string, payload?: unknown, sender: unknown = bubble, url = TRUSTED) =>
    ipc.handlers.get(channel)?.({ sender, senderFrame: { url } }, payload);

  beforeEach(() => {
    ipc.handlers.clear();
    vi.clearAllMocks();
    current = bubble;
    registerRitualHandlers(() => current, handlers, [TRUSTED], logger);
  });

  it('passes on ready, finish and close without a payload', () => {
    send(IpcChannel.RitualReady);
    send(IpcChannel.RitualFinish);
    send(IpcChannel.RitualClose);

    expect(handlers.ready).toHaveBeenCalledOnce();
    expect(handlers.finish).toHaveBeenCalledOnce();
    expect(handlers.close).toHaveBeenCalledOnce();
  });

  it.each(['breathe', 'eyes', 'stretch'] as const)('starts the "%s" ritual', (ritual) => {
    send(IpcChannel.RitualStart, ritual);

    expect(handlers.start).toHaveBeenCalledWith(ritual);
  });

  it.each([
    ['an unknown ritual', IpcChannel.RitualStart, 'nap'],
    ['a payload on finish', IpcChannel.RitualFinish, { mood: 100 }],
    ['a payload on close', IpcChannel.RitualClose, 'now'],
  ])('rejects %s', (_case, channel, payload) => {
    send(channel, payload);

    expect(handlers.start).not.toHaveBeenCalled();
    expect(handlers.finish).not.toHaveBeenCalled();
    expect(handlers.close).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('rejects other windows, a closed bubble and a page that navigated away', () => {
    send(IpcChannel.RitualFinish, undefined, { id: 1 });
    send(IpcChannel.RitualFinish, undefined, bubble, 'https://example.com/');
    current = undefined;
    send(IpcChannel.RitualFinish);

    expect(handlers.finish).not.toHaveBeenCalled();
  });
});
