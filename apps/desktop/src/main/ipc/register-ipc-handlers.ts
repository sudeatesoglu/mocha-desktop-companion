import { ipcMain } from 'electron';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { rendererErrorReportSchema } from './schemas.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/** Handlers every app window may use. Window-specific ones live in their own modules. */
export function registerIpcHandlers(trustedUrls: readonly string[], logger: IpcLogger): void {
  const reportRendererError = validated(
    IpcChannel.ReportRendererError,
    rendererErrorReportSchema,
    (report) => console.error('[renderer]', report.message, report.source ?? ''),
    { isTrusted: (url) => isTrustedSenderUrl(url, trustedUrls), logger },
  );
  ipcMain.on(IpcChannel.ReportRendererError, (event, payload: unknown) => {
    reportRendererError(senderUrl(event), payload);
  });
}
