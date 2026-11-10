/** The part of Electron's systemPreferences the watcher needs (macOS only). */
export interface WorkspaceNotifications {
  subscribeWorkspaceNotification(event: string, callback: () => void): number;
  unsubscribeWorkspaceNotification(id: number): void;
}

/** Posted by macOS after the user switched to another Space (desktop). */
export const SPACE_CHANGED_NOTIFICATION = 'NSWorkspaceActiveSpaceDidChangeNotification';

/**
 * Calls `onChange` whenever the user switches Spaces. Spaces are a macOS
 * concept, so on other platforms this does nothing. Returns a function
 * that stops watching.
 */
export function watchSpaceChanges(
  platform: NodeJS.Platform,
  notifications: WorkspaceNotifications,
  onChange: () => void,
): () => void {
  if (platform !== 'darwin') return () => {};
  const id = notifications.subscribeWorkspaceNotification(SPACE_CHANGED_NOTIFICATION, onChange);
  return () => notifications.unsubscribeWorkspaceNotification(id);
}
