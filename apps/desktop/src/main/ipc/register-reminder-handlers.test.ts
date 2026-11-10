import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { registerReminderHandlers } from './register-reminder-handlers.ts';

type Handler = (event: unknown, payload?: unknown) => unknown;
const ipc = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));
vi.mock('electron', () => ({
  ipcMain: { on: (channel: string, handler: Handler) => ipc.handlers.set(channel, handler) },
}));

const TRUSTED = 'file:///app/out/renderer/reminder.html';
const reminderContents = { id: 7 };

describe('registerReminderHandlers', () => {
  const onChoice = vi.fn();
  const logger = { warn: vi.fn() };
  let current: unknown;

  const send = (sender: unknown, payload: unknown, url = TRUSTED) =>
    ipc.handlers.get(IpcChannel.ReminderChoose)?.({ sender, senderFrame: { url } }, payload);

  beforeEach(() => {
    ipc.handlers.clear();
    vi.clearAllMocks();
    current = reminderContents;
    registerReminderHandlers(() => current, onChoice, [TRUSTED], logger);
  });

  it.each(['accept', 'snooze', 'dismiss'] as const)(
    'passes on "%s" from the reminder',
    (choice) => {
      send(reminderContents, choice);

      expect(onChoice).toHaveBeenCalledWith(choice);
    },
  );

  it.each([
    ['an unknown choice', 'delete'],
    ['a non-string', 1],
    ['nothing', undefined],
  ])('rejects %s', (_case, payload) => {
    send(reminderContents, payload);

    expect(onChoice).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('rejects the message from any other window, such as the overlay', () => {
    send({ id: 1 }, 'accept');

    expect(onChoice).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('rejects everything while no reminder is open', () => {
    current = undefined;

    send(reminderContents, 'accept');

    expect(onChoice).not.toHaveBeenCalled();
  });

  it('rejects a page that navigated away from the reminder', () => {
    send(reminderContents, 'accept', 'https://example.com/');

    expect(onChoice).not.toHaveBeenCalled();
  });
});
