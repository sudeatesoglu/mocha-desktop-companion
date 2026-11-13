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
  onPausedChange: (callback) => {
    const listener = (_event: unknown, paused: boolean) => callback(paused);
    ipcRenderer.on(IpcChannel.OverlayPaused, listener);
    return () => ipcRenderer.removeListener(IpcChannel.OverlayPaused, listener);
  },
  onSpaceChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IpcChannel.OverlaySpaceChanged, listener);
    return () => ipcRenderer.removeListener(IpcChannel.OverlaySpaceChanged, listener);
  },
  onAwayChange: (callback) => {
    const listener = (_event: unknown, away: boolean) => callback(away);
    ipcRenderer.on(IpcChannel.OverlayAway, listener);
    return () => ipcRenderer.removeListener(IpcChannel.OverlayAway, listener);
  },
  openTower: () => ipcRenderer.send(IpcChannel.OpenTower),
  petted: () => ipcRenderer.send(IpcChannel.OverlayPetted),
};

contextBridge.exposeInMainWorld('mocha', bridge);
