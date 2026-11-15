import type { RitualPose } from '@mocha/core';
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
  onRestingChange: (callback) => {
    const listener = (_event: unknown, resting: boolean) => callback(resting);
    ipcRenderer.on(IpcChannel.OverlayResting, listener);
    return () => ipcRenderer.removeListener(IpcChannel.OverlayResting, listener);
  },
  ready: () => ipcRenderer.send(IpcChannel.OverlayReady),
  onRitualChange: (callback) => {
    const listener = (_event: unknown, pose: RitualPose | null) => callback(pose);
    ipcRenderer.on(IpcChannel.OverlayRitual, listener);
    return () => ipcRenderer.removeListener(IpcChannel.OverlayRitual, listener);
  },
  onFocusingChange: (callback) => {
    const listener = (_event: unknown, focusing: boolean) => callback(focusing);
    ipcRenderer.on(IpcChannel.OverlayFocusing, listener);
    return () => ipcRenderer.removeListener(IpcChannel.OverlayFocusing, listener);
  },
  onTiredChange: (callback) => {
    const listener = (_event: unknown, tired: boolean) => callback(tired);
    ipcRenderer.on(IpcChannel.OverlayTired, listener);
    return () => ipcRenderer.removeListener(IpcChannel.OverlayTired, listener);
  },
  onFound: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IpcChannel.OverlayFound, listener);
    return () => ipcRenderer.removeListener(IpcChannel.OverlayFound, listener);
  },
  openTower: () => ipcRenderer.send(IpcChannel.OpenTower),
  petted: () => ipcRenderer.send(IpcChannel.OverlayPetted),
};

contextBridge.exposeInMainWorld('mocha', bridge);
