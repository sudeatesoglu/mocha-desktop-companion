import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type SettingsBridge } from '../shared/ipc-channels.ts';

// The settings window gets its own preload with only these operations,
// not the overlay's or the reminder's API (least privilege).
const bridge: SettingsBridge = {
  load: () => ipcRenderer.invoke(IpcChannel.SettingsLoad),
  save: (preferences) => ipcRenderer.invoke(IpcChannel.SettingsSave, preferences),
  loginItem: () => ipcRenderer.invoke(IpcChannel.SettingsLoginItem),
  setOpenAtLogin: (open) => ipcRenderer.invoke(IpcChannel.SettingsOpenAtLogin, open),
  sounds: () => ipcRenderer.invoke(IpcChannel.SettingsSounds),
  setSounds: (enabled) => ipcRenderer.invoke(IpcChannel.SettingsSetSounds, enabled),
  browser: () => ipcRenderer.invoke(IpcChannel.SettingsBrowser),
  allowBrowser: (allowed) => ipcRenderer.invoke(IpcChannel.SettingsAllowBrowser, allowed),
  newPairingCode: () => ipcRenderer.invoke(IpcChannel.SettingsNewPairingCode),
  copyPairingCode: () => ipcRenderer.invoke(IpcChannel.SettingsCopyPairingCode),
  setCapability: (name, enabled) =>
    ipcRenderer.invoke(IpcChannel.SettingsSetCapability, { name, enabled }),
  ai: () => ipcRenderer.invoke(IpcChannel.SettingsAi),
  changeAi: (change) => ipcRenderer.invoke(IpcChannel.SettingsChangeAi, change),
  saveClaudeKey: (key) => ipcRenderer.invoke(IpcChannel.SettingsSaveClaudeKey, key),
  forgetClaudeKey: () => ipcRenderer.invoke(IpcChannel.SettingsForgetClaudeKey),
  tryAi: () => ipcRenderer.invoke(IpcChannel.SettingsTryAi),
};

contextBridge.exposeInMainWorld('settings', bridge);
