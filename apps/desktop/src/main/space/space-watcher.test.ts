import { describe, expect, it, vi } from 'vitest';
import { SPACE_CHANGED_NOTIFICATION, watchSpaceChanges } from './space-watcher.ts';

const fakeNotifications = () => {
  const callbacks = new Map<number, () => void>();
  return {
    callbacks,
    subscribeWorkspaceNotification: vi.fn((_event: string, callback: () => void) => {
      const id = callbacks.size + 1;
      callbacks.set(id, callback);
      return id;
    }),
    unsubscribeWorkspaceNotification: vi.fn((id: number) => {
      callbacks.delete(id);
    }),
  };
};

describe('watchSpaceChanges', () => {
  it('listens for Space switches on macOS', () => {
    const notifications = fakeNotifications();
    const onChange = vi.fn();

    watchSpaceChanges('darwin', notifications, onChange);
    for (const callback of notifications.callbacks.values()) callback();

    expect(notifications.subscribeWorkspaceNotification).toHaveBeenCalledWith(
      SPACE_CHANGED_NOTIFICATION,
      onChange,
    );
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('unsubscribes when stopped', () => {
    const notifications = fakeNotifications();

    const stop = watchSpaceChanges('darwin', notifications, vi.fn());
    stop();

    expect(notifications.unsubscribeWorkspaceNotification).toHaveBeenCalledWith(1);
    expect(notifications.callbacks.size).toBe(0);
  });

  it.each(['win32', 'linux'] as const)('does nothing on %s, which has no Spaces', (platform) => {
    const notifications = fakeNotifications();

    const stop = watchSpaceChanges(platform, notifications, vi.fn());
    stop();

    expect(notifications.subscribeWorkspaceNotification).not.toHaveBeenCalled();
    expect(notifications.unsubscribeWorkspaceNotification).not.toHaveBeenCalled();
  });
});
