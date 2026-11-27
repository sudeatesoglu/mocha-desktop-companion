import { type IpcMainInvokeEvent, ipcMain } from 'electron';
import { z } from 'zod';
import {
  AI_FEATURES,
  AI_PROVIDERS,
  type AiChange,
  type AiTry,
  type AiView,
  CLAUDE_MODELS,
} from '../../shared/ai.ts';
import { IpcChannel } from '../../shared/ipc-channels.ts';
import { type IpcLogger, isTrustedSenderUrl, senderUrl, validated } from './validate.ts';

/** What the AI section of Settings may do; main keeps the rules (ADR-0013). */
export interface AiAccess {
  view(): Promise<AiView>;
  change(change: AiChange): Promise<AiView>;
  /** Encrypts and keeps the key, if the keychain can; the view says whether it did. */
  saveKey(key: string): Promise<AiView>;
  forgetKey(): Promise<AiView>;
  tryIt(): Promise<AiTry>;
  /** Deletes the chat, summaries, memories and insight (ADR-0013). */
  forgetEverything(): void;
}

const changeSchema = z.discriminatedUnion('change', [
  z.strictObject({ change: z.literal('provider'), provider: z.enum(AI_PROVIDERS) }),
  z.strictObject({ change: z.literal('localModel'), model: z.string().min(1).max(200) }),
  z.strictObject({
    change: z.literal('readerModel'),
    model: z.string().min(1).max(200).nullable(),
  }),
  z.strictObject({ change: z.literal('claudeModel'), model: z.enum(CLAUDE_MODELS) }),
  z.strictObject({
    change: z.literal('feature'),
    feature: z.enum(AI_FEATURES),
    enabled: z.boolean(),
  }),
]);

/**
 * The AI section's channels, for the open settings window only. The key
 * goes one way, into main; nothing ever sends it back.
 */
export function registerAiHandlers(
  currentSender: () => unknown,
  ai: AiAccess,
  trustedUrls: readonly string[],
  logger: IpcLogger,
): void {
  const isTrusted = (url: string) => isTrustedSenderUrl(url, trustedUrls);
  const fromSettings = (channel: string, event: IpcMainInvokeEvent) => {
    const expected = currentSender();
    if (expected !== undefined && event.sender === expected) return true;
    logger.warn(`[ipc] ${channel}: rejected sender other than the settings window`);
    return false;
  };
  const handle = <S extends z.ZodType, R>(
    channel: string,
    schema: S,
    run: (payload: z.infer<S>) => Promise<R>,
    refused: () => Promise<R | undefined>,
  ) => {
    const checked = validated(channel, schema, run, { isTrusted, logger });
    ipcMain.handle(channel, (event, payload: unknown) => {
      if (!fromSettings(channel, event)) return undefined;
      const result = checked(senderUrl(event), payload);
      return result.ok ? result.value : refused();
    });
  };

  handle(
    IpcChannel.SettingsAi,
    z.undefined(),
    () => ai.view(),
    async () => undefined,
  );
  handle(IpcChannel.SettingsChangeAi, changeSchema, ai.change, () => ai.view());
  // Never logged: a refused key is only counted as refused.
  handle(IpcChannel.SettingsSaveClaudeKey, z.string().min(1).max(300), ai.saveKey, () => ai.view());
  handle(
    IpcChannel.SettingsForgetClaudeKey,
    z.undefined(),
    () => ai.forgetKey(),
    () => ai.view(),
  );
  handle(
    IpcChannel.SettingsTryAi,
    z.undefined(),
    () => ai.tryIt(),
    async () => undefined,
  );
  handle(
    IpcChannel.SettingsForgetEverything,
    z.undefined(),
    async () => ai.forgetEverything(),
    async () => undefined,
  );
}
