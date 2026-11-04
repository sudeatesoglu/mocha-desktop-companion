import { ipcMain } from 'electron';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { createReportLimiter, type ReportLimiter } from './rate-limit.ts';
import { rendererErrorReportSchema } from './schemas.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/** A burst of 10 reports, then one per second per window. */
const REPORT_BURST = 10;
const REPORTS_PER_SECOND = 1;

/** Handlers every app window may use. Window-specific ones live in their own modules. */
export function registerIpcHandlers(
  trustedUrls: readonly string[],
  logger: IpcLogger,
  now: () => number = () => performance.now(),
): void {
  const validateReport = validated(
    IpcChannel.ReportRendererError,
    rendererErrorReportSchema,
    (report) => report,
    { isTrusted: (url) => isTrustedSenderUrl(url, trustedUrls), logger },
  );

  // One limiter per sending window, so a page stuck in an error loop cannot
  // drown out the others. A WeakMap lets closed windows' limiters be freed.
  const limiters = new WeakMap<object, ReportLimiter>();
  const limiterFor = (sender: object) => {
    let limiter = limiters.get(sender);
    if (!limiter) {
      limiter = createReportLimiter(
        { capacity: REPORT_BURST, refillPerSecond: REPORTS_PER_SECOND, now },
        (count) => logger.warn(`[renderer] ${count} error reports dropped (rate limit)`),
      );
      limiters.set(sender, limiter);
    }
    return limiter;
  };

  ipcMain.on(IpcChannel.ReportRendererError, (event, payload: unknown) => {
    // Limit before validating: rejected messages write warnings too, and a
    // flood of invalid payloads must not fill the log either.
    limiterFor(event.sender).submit(() => {
      const result = validateReport(senderUrl(event), payload);
      if (!result.ok) return;
      const { message, source } = result.value;
      console.error('[renderer]', message, source ?? '');
    });
  });
}
