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
  ready: () => ipcRenderer.send(IpcChannel.TowerReady),
  act: (action) => ipcRenderer.send(IpcChannel.TowerAct, action),
  focus: (minutes) => ipcRenderer.send(IpcChannel.TowerFocus, minutes),
  wear: (slot, id) => ipcRenderer.send(IpcChannel.TowerWear, { slot, id }),
  place: (slot, id) => ipcRenderer.send(IpcChannel.TowerPlace, { slot, id }),
  chat: () => ipcRenderer.invoke(IpcChannel.TowerChat),
  sendChat: async (message, onText) => {
    // Pieces arrive while the answer is being written; only this answer's.
    const listener = (_event: unknown, piece: string) => onText(piece);
    ipcRenderer.on(IpcChannel.TowerChatText, listener);
    try {
      return await ipcRenderer.invoke(IpcChannel.TowerChatSend, message);
    } finally {
      ipcRenderer.removeListener(IpcChannel.TowerChatText, listener);
    }
  },
  memories: () => ipcRenderer.invoke(IpcChannel.TowerMemories),
  editMemory: (id, text) => ipcRenderer.invoke(IpcChannel.TowerEditMemory, { id, text }),
  pinMemory: (id, pinned) => ipcRenderer.invoke(IpcChannel.TowerPinMemory, { id, pinned }),
  forgetMemory: (id) => ipcRenderer.invoke(IpcChannel.TowerForgetMemory, id),
  forgetEverything: () => ipcRenderer.invoke(IpcChannel.TowerForgetEverything),
};

contextBridge.exposeInMainWorld('tower', bridge);
