import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type SettingsBridge } from '../shared/ipc-channels.ts';

// The settings window gets its own preload with only these operations,
// not the overlay's or the reminder's API (least privilege).
const bridge: SettingsBridge = {
  load: () => ipcRenderer.invoke(IpcChannel.SettingsLoad),
  save: (preferences) => ipcRenderer.invoke(IpcChannel.SettingsSave, preferences),
  loginItem: () => ipcRenderer.invoke(IpcChannel.SettingsLoginItem),
  setOpenAtLogin: (open) => ipcRenderer.invoke(IpcChannel.SettingsOpenAtLogin, open),
};

contextBridge.exposeInMainWorld('settings', bridge);
