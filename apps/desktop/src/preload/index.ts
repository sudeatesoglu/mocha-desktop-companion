import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type MochaBridge } from '../shared/ipc-channels.ts';

// Expose a small, explicit API instead of ipcRenderer itself, so a page can
// only call the operations listed here (least privilege).
const bridge: MochaBridge = {
  reportError: (report) => ipcRenderer.send(IpcChannel.ReportRendererError, report),
  setOverlayInteractive: (interactive) =>
    ipcRenderer.send(IpcChannel.SetOverlayInteractive, interactive),
  dragOverlay: (phase) => ipcRenderer.send(IpcChannel.DragOverlay, phase),
  onCursorMove: (callback) => {
    // Pass only the point on, never the IPC event (it exposes the sender).
    const listener = (_event: unknown, point: { x: number; y: number }) => callback(point);
    ipcRenderer.on(IpcChannel.OverlayCursor, listener);
    return () => ipcRenderer.removeListener(IpcChannel.OverlayCursor, listener);
  },
};

contextBridge.exposeInMainWorld('mocha', bridge);
