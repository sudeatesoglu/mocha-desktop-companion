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
  const dragger = { start: vi.fn(), end: vi.fn() };
  const openTower = vi.fn();
  const petted = vi.fn();
  const ready = vi.fn();

  const send = (
    sender: unknown,
    payload: unknown,
    url = TRUSTED,
    channel: string = IpcChannel.SetOverlayInteractive,
  ) => {
    const handler = ipc.handlers.get(channel);
    if (!handler) throw new Error('handler not registered');
    handler({ sender, senderFrame: { url } }, payload);
  };

  beforeEach(() => {
    ipc.handlers.clear();
    vi.clearAllMocks();
    registerOverlayHandlers(overlay, dragger, { ready, openTower, petted }, [TRUSTED], logger);
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

  describe(IpcChannel.DragOverlay, () => {
    const drag = (payload: unknown, sender: unknown = overlayContents) =>
      send(sender, payload, TRUSTED, IpcChannel.DragOverlay);

    it('starts and ends a drag', () => {
      drag('start');
      drag('end');

      expect(dragger.start).toHaveBeenCalledOnce();
      expect(dragger.end).toHaveBeenCalledOnce();
    });

    it.each([
      ['an unknown phase', 'fling'],
      ['a non-string', 1],
      ['nothing', undefined],
    ])('rejects %s', (_case, payload) => {
      drag(payload);

      expect(dragger.start).not.toHaveBeenCalled();
      expect(dragger.end).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it('ignores drag messages from another window of the app', () => {
      drag('start', otherContents);

      expect(dragger.start).not.toHaveBeenCalled();
    });
  });

  describe(IpcChannel.OpenTower, () => {
    const open = (payload: unknown, sender: unknown = overlayContents) =>
      send(sender, payload, TRUSTED, IpcChannel.OpenTower);

    it('opens the Tower when the overlay asks', () => {
      open(undefined);

      expect(openTower).toHaveBeenCalledOnce();
    });

    it('rejects any payload: the overlay cannot say what to open', () => {
      open('file:///etc/passwd');

      expect(openTower).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it('ignores the request from another window of the app', () => {
      open(undefined, otherContents);

      expect(openTower).not.toHaveBeenCalled();
    });
  });

  describe(IpcChannel.OverlayPetted, () => {
    const pet = (payload: unknown, sender: unknown = overlayContents) =>
      send(sender, payload, TRUSTED, IpcChannel.OverlayPetted);

    it('passes a pet on', () => {
      pet(undefined);

      expect(petted).toHaveBeenCalledOnce();
    });

    it('rejects a payload: the overlay cannot say how much a pet counts', () => {
      pet({ mood: 100 });

      expect(petted).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it('ignores a pet from another window of the app', () => {
      pet(undefined, otherContents);

      expect(petted).not.toHaveBeenCalled();
    });
  });

  describe(IpcChannel.OverlayReady, () => {
    const announce = (payload: unknown, sender: unknown = overlayContents) =>
      send(sender, payload, TRUSTED, IpcChannel.OverlayReady);

    it('asks main for the current state when the page listens', () => {
      announce(undefined);

      expect(ready).toHaveBeenCalledOnce();
    });

    it('rejects a payload and other windows', () => {
      announce({ tired: false });
      announce(undefined, otherContents);

      expect(ready).not.toHaveBeenCalled();
    });
  });
});
