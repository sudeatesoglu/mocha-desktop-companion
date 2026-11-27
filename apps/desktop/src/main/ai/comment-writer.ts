import { type BrowsingContext, cleanAnswer, commentPrompt, MAX_COMMENT_CHARS } from '@mocha/core';
import type { AiProblem } from '../../shared/ai.ts';
import type { AiProvider } from './ai-provider.ts';

/** A written comment must come quickly; otherwise the fixed line is said. */
export const COMMENT_WRITE_MS = 10_000;

/**
 * A comment written by the model for the page in front, from only the
 * browser details the user allows (ADR-0012, ADR-0013), or `fallback`, the
 * fixed line Mocha would have said, when there is no model, it fails, it
 * is slow or it says nothing.
 */
export async function writeComment(
  provider: AiProvider | AiProblem | undefined,
  context: BrowsingContext,
  fallback: string,
  timeoutMs = COMMENT_WRITE_MS,
): Promise<string> {
  if (provider === undefined || typeof provider === 'string') return fallback;
  const result = await provider.answer(commentPrompt(context), {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!result.ok) return fallback;
  return cleanAnswer(result.text, { maxChars: MAX_COMMENT_CHARS, singleLine: true }) || fallback;
}
