import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type MochaBridge } from '../shared/ipc-channels.ts';

// Expose a small, explicit API instead of ipcRenderer itself, so a page can
// only call the operations listed here (least privilege).
const bridge: MochaBridge = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannel.GetAppInfo),
  reportError: (report) => ipcRenderer.send(IpcChannel.ReportRendererError, report),
};

contextBridge.exposeInMainWorld('mocha', bridge);
