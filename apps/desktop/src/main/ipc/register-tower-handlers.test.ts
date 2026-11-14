import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { registerTowerHandlers } from './register-tower-handlers.ts';

type Handler = (event: unknown, payload?: unknown) => unknown;
const ipc = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));
vi.mock('electron', () => ({
  ipcMain: { on: (channel: string, handler: Handler) => ipc.handlers.set(channel, handler) },
}));

const TRUSTED = 'file:///app/out/renderer/tower.html';
const towerContents = { id: 5 };

describe('registerTowerHandlers', () => {
  const onAction = vi.fn();
  const ready = vi.fn();
  const focus = vi.fn();
  const logger = { warn: vi.fn() };
  let current: unknown;

  const send = (sender: unknown, payload: unknown, url = TRUSTED) =>
    ipc.handlers.get(IpcChannel.TowerAct)?.({ sender, senderFrame: { url } }, payload);

  beforeEach(() => {
    ipc.handlers.clear();
    vi.clearAllMocks();
    current = towerContents;
    registerTowerHandlers(() => current, { ready, act: onAction, focus }, [TRUSTED], logger);
  });

  it.each(['pet', 'treat', 'rest'] as const)('passes on "%s" from the Tower', (action) => {
    send(towerContents, action);

    expect(onAction).toHaveBeenCalledWith(action);
  });

  it.each([
    ['an unknown action', 'feed-all'],
    ['an object', { action: 'treat', count: 99 }],
    ['nothing', undefined],
  ])('rejects %s', (_case, payload) => {
    send(towerContents, payload);

    expect(onAction).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('rejects the message from any other window, such as the overlay', () => {
    send({ id: 1 }, 'treat');

    expect(onAction).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('rejects everything while the Tower is closed', () => {
    current = undefined;

    send(towerContents, 'pet');

    expect(onAction).not.toHaveBeenCalled();
  });

  it('rejects a page that navigated away from the Tower', () => {
    send(towerContents, 'pet', 'https://example.com/');

    expect(onAction).not.toHaveBeenCalled();
  });

  describe(IpcChannel.TowerReady, () => {
    const announce = (sender: unknown, payload?: unknown) =>
      ipc.handlers.get(IpcChannel.TowerReady)?.({ sender, senderFrame: { url: TRUSTED } }, payload);

    it('asks main for the needs when the page listens', () => {
      announce(towerContents);

      expect(ready).toHaveBeenCalledOnce();
    });

    it('rejects a payload and other windows', () => {
      announce(towerContents, { energy: 100 });
      announce({ id: 1 });

      expect(ready).not.toHaveBeenCalled();
    });
  });

  describe(IpcChannel.TowerFocus, () => {
    const ask = (payload: unknown, sender: unknown = towerContents) =>
      ipc.handlers.get(IpcChannel.TowerFocus)?.({ sender, senderFrame: { url: TRUSTED } }, payload);

    it.each([25, 40, 50, null])('passes on %s', (minutes) => {
      ask(minutes);

      expect(focus).toHaveBeenCalledWith(minutes);
    });

    it.each([
      ['another length', 600],
      ['a string', '25'],
      ['nothing', undefined],
    ])('rejects %s', (_case, payload) => {
      ask(payload);

      expect(focus).not.toHaveBeenCalled();
    });

    it('rejects other windows', () => {
      ask(25, { id: 1 });

      expect(focus).not.toHaveBeenCalled();
    });
  });
});
