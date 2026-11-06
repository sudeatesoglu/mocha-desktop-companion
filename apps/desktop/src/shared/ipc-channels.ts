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
  /** Overlay → main (send): "start" or "end" of dragging Mocha around. */
  DragOverlay: 'overlay:drag',
  /** Main → overlay: cursor position relative to the window, sent when it changes. */
  OverlayCursor: 'overlay:cursor',
  /** Main → overlay: Mocha was paused (true) or resumed (false) from the tray. */
  OverlayPaused: 'overlay:paused',
  /** Main → overlay: the user switched to another Space (macOS). */
  OverlaySpaceChanged: 'overlay:space-changed',
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
  /** Overlay only: the user started or stopped dragging Mocha. */
  dragOverlay(phase: 'start' | 'end'): void;
  /** Overlay only: cursor position relative to the window. Returns an unsubscribe function. */
  onCursorMove(callback: (point: { x: number; y: number }) => void): () => void;
  /** Overlay only: pause state changes. Returns an unsubscribe function. */
  onPausedChange(callback: (paused: boolean) => void): () => void;
  /** Overlay only: the user switched Spaces. Returns an unsubscribe function. */
  onSpaceChanged(callback: () => void): () => void;
}
