import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { registerIpcHandlers } from './register-ipc-handlers.ts';

type Handler = (event: unknown, payload?: unknown) => unknown;

// Captures the handlers registered on Electron's ipcMain.
const ipc = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));

vi.mock('electron', () => ({
  app: { getName: () => 'Mocha', getVersion: () => '1.2.3' },
  ipcMain: {
    handle: (channel: string, handler: Handler) => ipc.handlers.set(channel, handler),
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

  it('registers a handler for every channel', () => {
    expect([...ipc.handlers.keys()].sort()).toEqual(Object.values(IpcChannel).sort());
  });

  describe(IpcChannel.GetAppInfo, () => {
    it('returns the app name and version to a trusted renderer', () => {
      const result = handlerFor(IpcChannel.GetAppInfo)(fromUrl(TRUSTED), undefined);

      expect(result).toEqual({ name: 'Mocha', version: '1.2.3' });
    });

    it('rejects an untrusted sender with an error', () => {
      const call = () => handlerFor(IpcChannel.GetAppInfo)(fromUrl('https://example.com/'));

      expect(call).toThrow('request rejected');
      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it('rejects a sender whose frame is gone', () => {
      const call = () => handlerFor(IpcChannel.GetAppInfo)({ senderFrame: null });

      expect(call).toThrow('request rejected');
    });

    it('rejects an unexpected payload', () => {
      const call = () => handlerFor(IpcChannel.GetAppInfo)(fromUrl(TRUSTED), { evil: true });

      expect(call).toThrow('request rejected');
    });
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
