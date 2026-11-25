import { chatPrompt, cleanAnswer } from '@mocha/core';
import {
  type AiChange,
  type AiProblem,
  type AiTry,
  type AiView,
  CLAUDE_MODELS,
  NO_AI_FEATURES,
} from '../../shared/ai.ts';
import type { Settings } from '../settings/settings-store.ts';
import type { AiProvider, Fetch } from './ai-provider.ts';
import { createClaudeProvider } from './claude-provider.ts';
import { createOllamaProvider } from './ollama-provider.ts';

export type AiSettings = NonNullable<Settings['ai']>;

/** AI until the user says otherwise: off, nothing allowed (ADR-0013). */
export const DEFAULT_AI: AiSettings = {
  provider: 'off',
  claudeModel: CLAUDE_MODELS[0],
  features: NO_AI_FEATURES,
};

/** The AI section as Settings shows it: never the key, only whether there is one. */
export function aiView(ai: AiSettings, localModels: string[] | null, canStoreKey: boolean): AiView {
  return {
    provider: ai.provider,
    localModels,
    localModel: ai.localModel ?? null,
    claudeModel: ai.claudeModel,
    hasClaudeKey: ai.claudeKey !== undefined,
    canStoreKey,
    features: ai.features,
  };
}

/** `ai` with one change applied; a local model must be one Ollama has. */
export function applyAiChange(
  ai: AiSettings,
  change: AiChange,
  localModels: string[] | null,
): AiSettings {
  switch (change.change) {
    case 'provider':
      return { ...ai, provider: change.provider };
    case 'localModel':
      return localModels?.includes(change.model) ? { ...ai, localModel: change.model } : ai;
    case 'claudeModel':
      return { ...ai, claudeModel: change.model };
    case 'feature':
      return { ...ai, features: { ...ai.features, [change.feature]: change.enabled } };
  }
}

/**
 * The model to ask, or why there is none: AI off (undefined), no local
 * model picked, or no Claude key that can be read.
 */
export function providerFor(
  ai: AiSettings,
  { fetch, claudeKey }: { fetch: Fetch; claudeKey: () => string | undefined },
): AiProvider | AiProblem | undefined {
  if (ai.provider === 'local') {
    return ai.localModel ? createOllamaProvider(fetch, ai.localModel) : 'no model';
  }
  if (ai.provider === 'claude') {
    const key = claudeKey();
    return key ? createClaudeProvider(fetch, key, ai.claudeModel) : 'wrong key';
  }
  return undefined;
}

/** "Try it": a hello, so the user sees the model answer as Mocha. */
export async function tryAi(provider: AiProvider | AiProblem | undefined): Promise<AiTry> {
  if (provider === undefined) return { ok: false, problem: 'unavailable' };
  if (typeof provider === 'string') return { ok: false, problem: provider };
  const result = await provider.answer(
    chatPrompt({
      message: 'Say hello to me in one short sentence.',
      history: [],
      budgetTokens: 2_000,
      maxTokens: 60,
    }),
  );
  return result.ok
    ? { ok: true, text: cleanAnswer(result.text, { maxChars: 200, singleLine: true }) }
    : result;
}
