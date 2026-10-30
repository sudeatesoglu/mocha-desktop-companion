import { app, type IpcMainEvent, type IpcMainInvokeEvent, ipcMain } from 'electron';
import { z } from 'zod';
import { type AppInfo, IpcChannel } from '../../shared/ipc-channels.ts';
import { rendererErrorReportSchema } from './schemas.ts';
import { type IpcLogger, isTrustedSenderUrl, validated } from './validate.ts';

const senderUrl = (event: IpcMainEvent | IpcMainInvokeEvent): string =>
  event.senderFrame?.url ?? '';

export function registerIpcHandlers(trustedUrls: readonly string[], logger: IpcLogger): void {
  const options = {
    isTrusted: (url: string) => isTrustedSenderUrl(url, trustedUrls),
    logger,
  };

  const getAppInfo = validated(
    IpcChannel.GetAppInfo,
    z.undefined(), // takes no payload
    (): AppInfo => ({ name: app.getName(), version: app.getVersion() }),
    options,
  );
  ipcMain.handle(IpcChannel.GetAppInfo, (event, payload: unknown) => {
    const result = getAppInfo(senderUrl(event), payload);
    if (!result.ok) throw new Error(`${IpcChannel.GetAppInfo}: request rejected`);
    return result.value;
  });

  const reportRendererError = validated(
    IpcChannel.ReportRendererError,
    rendererErrorReportSchema,
    (report) => console.error('[renderer]', report.message, report.source ?? ''),
    options,
  );
  ipcMain.on(IpcChannel.ReportRendererError, (event, payload: unknown) => {
    reportRendererError(senderUrl(event), payload);
  });
}
