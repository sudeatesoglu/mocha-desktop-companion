import type { MochaBridge } from '../shared/ipc-channels.ts';

declare global {
  interface Window {
    /** Exposed by the preload script; the renderer's only door to the main process. */
    readonly mocha: MochaBridge;
  }
}
