import { createHash } from 'node:crypto';
import {
  chunkPage,
  cleanNote,
  gistPrompt,
  notePrompt,
  type PageGist,
  type PageLabel,
  type Prompt,
  parseGist,
  readPagePrompt,
} from '@mocha/core';
import type { AiProblem } from '../../shared/ai.ts';
import type { AiProvider } from './ai-provider.ts';

/** Each call to the reader may take this long: a cold local model is slow. */
export const READ_CALL_MS = 60_000;
/** Gists kept in memory, newest last (ADR-0014). */
export const MAX_GISTS = 50;

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/**
 * The reader layer (ADR-0014): a page's text into a short gist, read in
 * chunks when long (map, then reduce). Gists are kept in memory only, by
 * the text's hash, so a page read once is not read again; the same text
 * asked for twice at once is read once.
 */
export function createPageReader(deps: {
  /** The reader model, or why there is none. */
  provider(): AiProvider | AiProblem | undefined;
  timeoutMs?: number;
}) {
  const timeoutMs = deps.timeoutMs ?? READ_CALL_MS;
  const gists = new Map<string, PageGist>();
  const reading = new Map<string, Promise<PageGist | undefined>>();
  // Bumped by forget: what was being read before is dropped, not kept.
  let generation = 0;

  async function ask(provider: AiProvider, prompt: Prompt): Promise<string | undefined> {
    const result = await provider.answer(prompt, { signal: AbortSignal.timeout(timeoutMs) });
    return result.ok ? result.text : undefined;
  }

  async function readWith(
    provider: AiProvider,
    text: string,
    page: PageLabel,
  ): Promise<PageGist | undefined> {
    const chunks = chunkPage(text);
    if (chunks.length === 0) return undefined;
    if (chunks.length === 1) {
      const answer = await ask(provider, readPagePrompt(page, chunks[0] as string));
      return answer === undefined ? undefined : parseGist(answer);
    }
    // One chunk at a time: a local model answers one call at a time anyway.
    const notes: string[] = [];
    for (const [index, chunk] of chunks.entries()) {
      const answer = await ask(provider, notePrompt(page, chunk, index + 1, chunks.length));
      const note = answer === undefined ? undefined : cleanNote(answer);
      if (note) notes.push(note);
    }
    if (notes.length === 0) return undefined;
    const answer = await ask(provider, gistPrompt(page, notes));
    return answer === undefined ? undefined : parseGist(answer);
  }

  return {
    /** The gist of `text`, read now or remembered, or undefined. */
    read(text: string, page: PageLabel): Promise<PageGist | undefined> {
      const key = sha256(text);
      const known = gists.get(key);
      if (known) {
        // The newest last, so the oldest goes first when full.
        gists.delete(key);
        gists.set(key, known);
        return Promise.resolve(known);
      }
      const already = reading.get(key);
      if (already) return already;
      const provider = deps.provider();
      if (provider === undefined || typeof provider === 'string') {
        return Promise.resolve(undefined);
      }
      const started = generation;
      const read = readWith(provider, text, page)
        .then((gist) => {
          if (generation !== started) return undefined;
          if (gist) {
            gists.set(key, gist);
            if (gists.size > MAX_GISTS) gists.delete(gists.keys().next().value as string);
          }
          return gist;
        })
        .finally(() => {
          if (reading.get(key) === read) reading.delete(key);
        });
      reading.set(key, read);
      return read;
    },
    /** Forgets every gist, and drops what is being read. */
    forget(): void {
      generation++;
      gists.clear();
      reading.clear();
    },
  };
}

export type PageReader = ReturnType<typeof createPageReader>;
