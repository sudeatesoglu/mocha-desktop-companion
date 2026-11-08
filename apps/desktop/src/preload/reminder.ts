import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type ReminderBridge } from '../shared/ipc-channels.ts';
import type { ReminderShow } from '../shared/reminder.ts';

// The reminder gets its own preload with only these two operations, not the
// overlay's API (least privilege).
const bridge: ReminderBridge = {
  onShow: (callback) => {
    const listener = (_event: unknown, show: ReminderShow) => callback(show);
    ipcRenderer.on(IpcChannel.ReminderShow, listener);
    return () => ipcRenderer.removeListener(IpcChannel.ReminderShow, listener);
  },
  choose: (choice) => ipcRenderer.send(IpcChannel.ReminderChoose, choice),
};

contextBridge.exposeInMainWorld('reminder', bridge);
