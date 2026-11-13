import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type TowerBridge } from '../shared/ipc-channels.ts';
import type { TowerView } from '../shared/tower.ts';

// The Tower window gets its own preload with only its own operations, not
// the overlay's, the reminder's or the settings' API (least privilege).
const bridge: TowerBridge = {
  onNeeds: (callback) => {
    const listener = (_event: unknown, view: TowerView) => callback(view);
    ipcRenderer.on(IpcChannel.TowerNeeds, listener);
    return () => ipcRenderer.removeListener(IpcChannel.TowerNeeds, listener);
  },
  act: (action) => ipcRenderer.send(IpcChannel.TowerAct, action),
};

contextBridge.exposeInMainWorld('tower', bridge);
