import type { Prompt } from '@mocha/core';
import type { AiProblem } from '../../shared/ai.ts';

export type { AiProblem };

export type AiResult = { ok: true; text: string } | { ok: false; problem: AiProblem };

/** A model Mocha can ask, local or in the cloud (ADR-0013). */
export interface AiProvider {
  /**
   * Answers `prompt`, calling `onText` with each piece as it arrives, and
   * resolves with the whole answer. Never throws: failures are results.
   */
  answer(
    prompt: Prompt,
    options?: { onText?: (piece: string) => void; signal?: AbortSignal },
  ): Promise<AiResult>;
}

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** No answer takes longer than this; a slow local model is cut off too. */
export const ANSWER_TIMEOUT_MS = 60_000;

/** The caller's signal, plus the timeout. */
export function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** A failed fetch as a problem: a timeout, or nothing answering. */
export function fetchProblem(error: unknown): AiProblem {
  return error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'not running';
}

/** Lines of a streamed body, as they complete. */
export async function* lines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffered = '';
  for await (const chunk of body) {
    buffered += decoder.decode(chunk, { stream: true });
    let end = buffered.indexOf('\n');
    while (end !== -1) {
      yield buffered.slice(0, end).replace(/\r$/, '');
      buffered = buffered.slice(end + 1);
      end = buffered.indexOf('\n');
    }
  }
  buffered += decoder.decode();
  if (buffered) yield buffered;
}
