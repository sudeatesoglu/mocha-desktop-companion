import type { Prompt } from '@mocha/core';
import {
  type AiProvider,
  type AiResult,
  ANSWER_TIMEOUT_MS,
  type Fetch,
  fetchProblem,
  lines,
  withTimeout,
} from './ai-provider.ts';

/** Ollama on this computer only: nothing leaves it (ADR-0013). */
export const OLLAMA_URL = 'http://127.0.0.1:11434';
const LIST_TIMEOUT_MS = 3_000;

const messagesOf = (prompt: Prompt) => [
  { role: 'system', content: prompt.system },
  ...prompt.turns.map(({ role, content }) => ({ role, content })),
];

/** The models installed in Ollama, or null when Ollama does not answer. */
export async function ollamaModels(fetchFn: Fetch): Promise<string[] | null> {
  try {
    const response = await fetchFn(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const { models } = (await response.json()) as { models?: { name?: unknown }[] };
    return (models ?? [])
      .map(({ name }) => name)
      .filter((name): name is string => typeof name === 'string')
      .sort();
  } catch {
    return null;
  }
}

/** Answers with `model` in Ollama, streaming its NDJSON reply. */
export function createOllamaProvider(fetchFn: Fetch, model: string): AiProvider {
  return {
    async answer(prompt, options = {}): Promise<AiResult> {
      let response: Response;
      try {
        response = await fetchFn(`${OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: messagesOf(prompt),
            stream: true,
            // Thinking models would spend the whole limit thinking and say
            // nothing; Mocha needs only the answer. Others ignore it.
            think: false,
            options: { num_predict: prompt.maxTokens },
          }),
          signal: withTimeout(options.signal, ANSWER_TIMEOUT_MS),
        });
      } catch (error) {
        return { ok: false, problem: fetchProblem(error) };
      }
      if (response.status === 404) return { ok: false, problem: 'no model' };
      if (!response.ok || !response.body) return { ok: false, problem: 'unavailable' };
      let text = '';
      try {
        for await (const line of lines(response.body)) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { message?: { content?: unknown }; error?: unknown };
          if (event.error !== undefined) return { ok: false, problem: 'unavailable' };
          const piece = event.message?.content;
          if (typeof piece === 'string' && piece) {
            text += piece;
            options.onText?.(piece);
          }
        }
      } catch (error) {
        return {
          ok: false,
          problem: fetchProblem(error) === 'timeout' ? 'timeout' : 'unavailable',
        };
      }
      // An empty answer is no answer: Mocha never shows an empty bubble.
      return text.trim() ? { ok: true, text } : { ok: false, problem: 'unavailable' };
    },
  };
}
