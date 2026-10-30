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
const fromUrl = (url: string) => ({ senderFrame: { url } });

function handlerFor(channel: string): Handler {
  const handler = ipc.handlers.get(channel);
  if (!handler) throw new Error(`no handler registered for ${channel}`);
  return handler;
}

describe('registerIpcHandlers', () => {
  const logger = { warn: vi.fn() };

  beforeEach(() => {
    ipc.handlers.clear();
    logger.warn.mockClear();
    registerIpcHandlers([TRUSTED], logger);
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
  });
});
