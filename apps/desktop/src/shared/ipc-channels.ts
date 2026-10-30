/**
 * IPC channel names shared by the main process and the preload script.
 *
 * Kept free of dependencies so the preload bundle stays tiny. Payload
 * schemas live in the main process, which is the only side that validates.
 */
export const IpcChannel = {
  /** Renderer → main (send): report a renderer error to the main-process log. */
  ReportRendererError: 'app:report-renderer-error',
  /** Overlay → main (send): whether the cursor is over Mocha's pixels. */
  SetOverlayInteractive: 'overlay:set-interactive',
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];

export interface RendererErrorReport {
  message: string;
  source?: string;
}

/** The API the preload script exposes to renderers as `window.mocha`. */
export interface MochaBridge {
  reportError(report: RendererErrorReport): void;
  /** Overlay only: let clicks reach Mocha (true) or fall through (false). */
  setOverlayInteractive(interactive: boolean): void;
}
