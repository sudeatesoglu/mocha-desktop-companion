import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { type OverlayTarget, registerOverlayHandlers } from './register-overlay-handlers.ts';

type Handler = (event: unknown, payload?: unknown) => unknown;

const ipc = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));

vi.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, handler: Handler) => ipc.handlers.set(channel, handler),
  },
}));

const TRUSTED = 'file:///app/out/renderer/index.html';

describe('registerOverlayHandlers', () => {
  const overlayContents = { id: 1 };
  const otherContents = { id: 2 };
  const setIgnoreMouseEvents = vi.fn();
  const overlay = {
    webContents: overlayContents,
    setIgnoreMouseEvents,
  } as unknown as OverlayTarget;
  const logger = { warn: vi.fn() };

  const send = (sender: unknown, payload: unknown, url = TRUSTED) => {
    const handler = ipc.handlers.get(IpcChannel.SetOverlayInteractive);
    if (!handler) throw new Error('handler not registered');
    handler({ sender, senderFrame: { url } }, payload);
  };

  beforeEach(() => {
    ipc.handlers.clear();
    vi.clearAllMocks();
    registerOverlayHandlers(overlay, [TRUSTED], logger);
  });

  it('makes the overlay clickable while the cursor is over Mocha', () => {
    send(overlayContents, true);

    expect(setIgnoreMouseEvents).toHaveBeenCalledWith(false, { forward: true });
  });

  it('makes the overlay click-through again when the cursor leaves Mocha', () => {
    send(overlayContents, false);

    expect(setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
  });

  it('ignores the same message from another window of the app', () => {
    send(otherContents, true);

    expect(setIgnoreMouseEvents).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it.each([
    ['a string', 'true'],
    ['a number', 1],
    ['nothing', undefined],
  ])('rejects %s as payload', (_case, payload) => {
    send(overlayContents, payload);

    expect(setIgnoreMouseEvents).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('rejects the overlay page if it was navigated to an untrusted URL', () => {
    send(overlayContents, true, 'https://example.com/');

    expect(setIgnoreMouseEvents).not.toHaveBeenCalled();
  });
});
