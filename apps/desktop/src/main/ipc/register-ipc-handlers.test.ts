import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { registerIpcHandlers } from './register-ipc-handlers.ts';

type Handler = (event: unknown, payload?: unknown) => unknown;

// Captures the handlers registered on Electron's ipcMain.
const ipc = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));

vi.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, handler: Handler) => ipc.handlers.set(channel, handler),
  },
}));

const TRUSTED = 'file:///app/out/renderer/index.html';
const WINDOW = { id: 1 };
const fromUrl = (url: string, sender: object = WINDOW) => ({ sender, senderFrame: { url } });

function handlerFor(channel: string): Handler {
  const handler = ipc.handlers.get(channel);
  if (!handler) throw new Error(`no handler registered for ${channel}`);
  return handler;
}

describe('registerIpcHandlers', () => {
  const logger = { warn: vi.fn() };
  let time = 0;

  beforeEach(() => {
    ipc.handlers.clear();
    logger.warn.mockClear();
    time = 0;
    registerIpcHandlers([TRUSTED], logger, () => time);
  });

  it('registers the app-wide channels (overlay channels live in their own module)', () => {
    expect([...ipc.handlers.keys()]).toEqual([IpcChannel.ReportRendererError]);
  });

  describe(IpcChannel.ReportRendererError, () => {
    it('logs a valid report in the main process', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      handlerFor(IpcChannel.ReportRendererError)(fromUrl(TRUSTED), {
        message: 'boom',
        source: 'index.ts',
      });

      expect(error).toHaveBeenCalledWith('[renderer]', 'boom', 'index.ts');
    });

    it('logs a report that has no source', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      handlerFor(IpcChannel.ReportRendererError)(fromUrl(TRUSTED), { message: 'boom' });

      expect(error).toHaveBeenCalledWith('[renderer]', 'boom', '');
    });

    it('drops an invalid report with a warning', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      handlerFor(IpcChannel.ReportRendererError)(fromUrl(TRUSTED), { message: 42 });

      expect(error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it('throttles a flood of reports from one window and summarizes what was dropped', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const report = handlerFor(IpcChannel.ReportRendererError);

      for (let i = 0; i < 25; i++) report(fromUrl(TRUSTED), { message: `boom ${i}` });
      expect(error).toHaveBeenCalledTimes(10); // the allowed burst

      time += 1_000;
      report(fromUrl(TRUSTED), { message: 'later' });

      expect(logger.warn).toHaveBeenCalledWith('[renderer] 15 error reports dropped (rate limit)');
      expect(error).toHaveBeenLastCalledWith('[renderer]', 'later', '');
    });

    it('throttles a flood of invalid reports too, so warnings cannot fill the log', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const report = handlerFor(IpcChannel.ReportRendererError);

      for (let i = 0; i < 25; i++) report(fromUrl(TRUSTED), { message: 42 });

      expect(logger.warn).toHaveBeenCalledTimes(10); // one per allowed message
    });

    it('limits each window on its own', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const report = handlerFor(IpcChannel.ReportRendererError);
      for (let i = 0; i < 20; i++) report(fromUrl(TRUSTED), { message: 'loop' });

      report(fromUrl(TRUSTED, { id: 2 }), { message: 'from another window' });

      expect(error).toHaveBeenLastCalledWith('[renderer]', 'from another window', '');
    });
  });
});

describe('registerIpcHandlers with the real clock', () => {
  it('works without an injected clock', () => {
    ipc.handlers.clear();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerIpcHandlers([TRUSTED], { warn: vi.fn() });

    handlerFor(IpcChannel.ReportRendererError)(fromUrl(TRUSTED), { message: 'boom' });

    expect(error).toHaveBeenCalledWith('[renderer]', 'boom', '');
  });
});
