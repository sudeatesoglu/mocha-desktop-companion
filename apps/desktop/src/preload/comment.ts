import { contextBridge, ipcRenderer } from 'electron';
import type { CommentShow } from '../shared/comment.ts';
import { type CommentBridge, IpcChannel } from '../shared/ipc-channels.ts';

// The comment bubble only listens: it sends nothing to main (least privilege).
const bridge: CommentBridge = {
  onShow: (callback) => {
    const listener = (_event: unknown, show: CommentShow) => callback(show);
    ipcRenderer.on(IpcChannel.CommentShow, listener);
    return () => ipcRenderer.removeListener(IpcChannel.CommentShow, listener);
  },
};

contextBridge.exposeInMainWorld('comment', bridge);
