import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type RitualBridge } from '../shared/ipc-channels.ts';
import type { RitualShow } from '../shared/ritual.ts';

// The ritual bubble gets its own preload with only its own operations
// (least privilege).
const bridge: RitualBridge = {
  ready: () => ipcRenderer.send(IpcChannel.RitualReady),
  onShow: (callback) => {
    const listener = (_event: unknown, show: RitualShow) => callback(show);
    ipcRenderer.on(IpcChannel.RitualShow, listener);
    return () => ipcRenderer.removeListener(IpcChannel.RitualShow, listener);
  },
  start: (ritual) => ipcRenderer.send(IpcChannel.RitualStart, ritual),
  finish: () => ipcRenderer.send(IpcChannel.RitualFinish),
  close: () => ipcRenderer.send(IpcChannel.RitualClose),
};

contextBridge.exposeInMainWorld('ritual', bridge);
