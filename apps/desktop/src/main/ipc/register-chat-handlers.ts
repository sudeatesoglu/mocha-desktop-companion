import { type IpcMainInvokeEvent, ipcMain } from 'electron';
import { z } from 'zod';
import {
  type ChatReply,
  type ChatView,
  MAX_CHAT_MESSAGE,
  type MemoryView,
} from '../../shared/chat.ts';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/** What the Tower's chat may do; main keeps the rules (ADR-0013). */
export interface ChatAccess {
  /** The chat, and what Mocha learned since it was last opened. */
  view(): ChatView;
  send(message: string, onText: (piece: string) => void): Promise<ChatReply>;
  memories(): MemoryView[];
  /** False when the text may not be kept as a memory. */
  edit(id: number, text: string): boolean;
  pin(id: number, pinned: boolean): MemoryView[];
  forget(id: number): MemoryView[];
  forgetEverything(): void;
}

const id = z.int().positive();

/**
 * The chat's channels, for the open Tower only, on its own page. One
 * message at a time: a second one while Mocha is answering is refused.
 */
export function registerChatHandlers(
  currentSender: () => unknown,
  chat: ChatAccess,
  trustedUrls: readonly string[],
  logger: IpcLogger,
): void {
  const isTrusted = (url: string) => isTrustedSenderUrl(url, trustedUrls);
  const fromTower = (channel: string, event: IpcMainInvokeEvent) => {
    const expected = currentSender();
    if (expected !== undefined && event.sender === expected) return true;
    logger.warn(`[ipc] ${channel}: rejected sender other than the Tower`);
    return false;
  };
  const handle = <S extends z.ZodType, R>(
    channel: string,
    schema: S,
    run: (payload: z.infer<S>, event: IpcMainInvokeEvent) => R,
    refused: R | undefined,
  ) => {
    ipcMain.handle(channel, (event, payload: unknown) => {
      if (!fromTower(channel, event)) return undefined;
      const checked = validated(channel, schema, (valid) => run(valid, event), {
        isTrusted,
        logger,
      });
      const result = checked(senderUrl(event), payload);
      return result.ok ? result.value : refused;
    });
  };

  let answering = false;
  handle(IpcChannel.TowerChat, z.undefined(), () => chat.view(), undefined);
  handle(
    IpcChannel.TowerChatSend,
    z.string().min(1).max(MAX_CHAT_MESSAGE),
    async (message, event): Promise<ChatReply> => {
      if (answering) return { ok: false, problem: 'busy' };
      answering = true;
      try {
        return await chat.send(message, (piece) => {
          if (!event.sender.isDestroyed()) event.sender.send(IpcChannel.TowerChatText, piece);
        });
      } finally {
        answering = false;
      }
    },
    Promise.resolve<ChatReply>({ ok: false, problem: 'unavailable' }),
  );
  handle(IpcChannel.TowerMemories, z.undefined(), () => chat.memories(), undefined);
  handle(
    IpcChannel.TowerEditMemory,
    z.strictObject({ id, text: z.string().min(1).max(500) }),
    ({ id: memory, text }) => chat.edit(memory, text),
    false,
  );
  handle(
    IpcChannel.TowerPinMemory,
    z.strictObject({ id, pinned: z.boolean() }),
    ({ id: memory, pinned }) => chat.pin(memory, pinned),
    undefined,
  );
  handle(IpcChannel.TowerForgetMemory, id, (memory) => chat.forget(memory), undefined);
  handle(IpcChannel.TowerForgetEverything, z.undefined(), () => chat.forgetEverything(), undefined);
}
