import type { Prompt } from '@mocha/core';
import {
  type AiProblem,
  type AiProvider,
  type AiResult,
  ANSWER_TIMEOUT_MS,
  type Fetch,
  fetchProblem,
  lines,
  withTimeout,
} from './ai-provider.ts';

/** Anthropic's API, used only with the user's own key (ADR-0013). */
export const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

/** The models the user may pick; the first is the default, quick and cheap. */
export const CLAUDE_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5'] as const;
export type ClaudeModel = (typeof CLAUDE_MODELS)[number];

function problemFor(status: number): AiProblem {
  if (status === 401 || status === 403) return 'wrong key';
  if (status === 404) return 'no model';
  if (status === 429 || status === 529) return 'busy';
  return 'unavailable';
}

/** Answers with Claude, streaming its server-sent events. */
export function createClaudeProvider(fetchFn: Fetch, key: string, model: ClaudeModel): AiProvider {
  return {
    async answer(prompt: Prompt, options = {}): Promise<AiResult> {
      let response: Response;
      try {
        response = await fetchFn(CLAUDE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: prompt.maxTokens,
            system: prompt.system,
            messages: prompt.turns.map(({ role, content }) => ({ role, content })),
            stream: true,
          }),
          signal: withTimeout(options.signal, ANSWER_TIMEOUT_MS),
        });
      } catch (error) {
        // Nothing answers: offline, as far as the user can tell.
        const problem = fetchProblem(error);
        return { ok: false, problem: problem === 'timeout' ? 'timeout' : 'unavailable' };
      }
      if (!response.ok || !response.body) {
        return { ok: false, problem: problemFor(response.status) };
      }
      let text = '';
      try {
        for await (const line of lines(response.body)) {
          if (!line.startsWith('data:')) continue;
          const event = JSON.parse(line.slice(5)) as {
            type?: string;
            delta?: { type?: string; text?: unknown };
            error?: { type?: string };
          };
          if (event.type === 'error') {
            return {
              ok: false,
              problem: event.error?.type === 'overloaded_error' ? 'busy' : 'unavailable',
            };
          }
          const piece = event.delta?.text;
          if (event.type === 'content_block_delta' && typeof piece === 'string') {
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
      return { ok: true, text };
    },
  };
}
