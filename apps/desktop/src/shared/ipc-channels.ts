/**
 * IPC channel names shared by the main process and the preload script.
 *
 * Kept free of dependencies so the preload bundle stays tiny. Payload
 * schemas live in the main process, which is the only side that validates.
 */
export const IpcChannel = {
  /** Renderer → main (invoke): app name and version for display. */
  GetAppInfo: 'app:get-info',
  /** Renderer → main (send): report a renderer error to the main-process log. */
  ReportRendererError: 'app:report-renderer-error',
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];

export interface AppInfo {
  name: string;
  version: string;
}

export interface RendererErrorReport {
  message: string;
  source?: string;
}

/** The API the preload script exposes to renderers as `window.mocha`. */
export interface MochaBridge {
  getAppInfo(): Promise<AppInfo>;
  reportError(report: RendererErrorReport): void;
}
