import { type Prompt, READ_CHUNK_CHARS } from '@mocha/core';
import { describe, expect, it, vi } from 'vitest';
import type { AiProvider, AiResult } from './ai-provider.ts';
import { createPageReader, MAX_GISTS } from './page-reader.ts';

const PAGE = { site: 'doc.rust-lang.org', title: 'Lifetimes' };
const GIST = '{"topic": "Rust lifetimes", "gist": "A chapter on lifetimes in Rust."}';

/** A reader model that answers notes for parts and the gist otherwise. */
function model(
  answer: (prompt: Prompt) => AiResult = (prompt) => ({
    ok: true,
    text: prompt.turns[0]?.content.includes('this part') ? 'Notes on a part.' : GIST,
  }),
) {
  const calls: Prompt[] = [];
  const provider: AiProvider = {
    answer: vi.fn(async (prompt: Prompt) => {
      calls.push(prompt);
      return answer(prompt);
    }),
  };
  return { provider, calls };
}

describe('createPageReader', () => {
  it('reads a short page in one call', async () => {
    const { provider, calls } = model();
    const reader = createPageReader({ provider: () => provider });

    expect(await reader.read('Lifetimes are generics.', PAGE)).toEqual({
      topic: 'Rust lifetimes',
      gist: 'A chapter on lifetimes in Rust.',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.system).toContain('"pageText":"Lifetimes are generics."');
  });

  it('reads a long page part by part, then the notes together', async () => {
    const { provider, calls } = model();
    const reader = createPageReader({ provider: () => provider });
    const text = `${'a'.repeat(READ_CHUNK_CHARS)}\n${'b'.repeat(100)}`;

    expect(await reader.read(text, PAGE)).toMatchObject({ topic: 'Rust lifetimes' });
    expect(calls).toHaveLength(3);
    expect(calls[2]?.system).toContain('"notesOnEachPart":["Notes on a part.","Notes on a part."]');
  });

  it('skips the notes it could not get, and gives up without any', async () => {
    let failing = true;
    const { provider, calls } = model((prompt) => {
      if (prompt.turns[0]?.content.includes('this part')) {
        failing = !failing;
        return failing ? { ok: false, problem: 'timeout' } : { ok: true, text: 'Part note.' };
      }
      return { ok: true, text: GIST };
    });
    const reader = createPageReader({ provider: () => provider });
    const long = `${'a'.repeat(READ_CHUNK_CHARS)}\n${'b'.repeat(100)}`;

    expect(await reader.read(long, PAGE)).toBeDefined();
    expect(calls.at(-1)?.system).toContain('"notesOnEachPart":["Part note."]');

    const silent = model((prompt) =>
      prompt.turns[0]?.content.includes('this part')
        ? { ok: true, text: ' ' }
        : { ok: true, text: GIST },
    );
    const quiet = createPageReader({ provider: () => silent.provider });
    expect(await quiet.read(long, PAGE)).toBeUndefined();
    expect(silent.calls).toHaveLength(2);

    const noGist = model((prompt) =>
      prompt.turns[0]?.content.includes('this part')
        ? { ok: true, text: 'Part note.' }
        : { ok: false, problem: 'busy' },
    );
    expect(await createPageReader({ provider: () => noGist.provider }).read(long, PAGE)).toBe(
      undefined,
    );
    expect(noGist.calls).toHaveLength(3);
  });

  it.each([
    ['no model', () => undefined],
    ['a problem', () => 'no model' as const],
  ])('gives nothing with %s', async (_, provider) => {
    expect(await createPageReader({ provider }).read('text', PAGE)).toBeUndefined();
  });

  it.each([
    ['fails', { ok: false, problem: 'timeout' } as const],
    ['says something else', { ok: true, text: 'It is about Rust.' } as const],
  ])('gives nothing when the model %s, and tries again later', async (_, result) => {
    const { provider, calls } = model(() => result);
    const reader = createPageReader({ provider: () => provider });

    expect(await reader.read('text', PAGE)).toBeUndefined();
    expect(await reader.read('text', PAGE)).toBeUndefined();
    expect(calls).toHaveLength(2);
    expect(await reader.read('  ', PAGE)).toBeUndefined();
    expect(calls).toHaveLength(2);
  });

  it('remembers a page by its text, and reads the same text once at a time', async () => {
    const { provider, calls } = model();
    const reader = createPageReader({ provider: () => provider });

    const [first, second] = await Promise.all([
      reader.read('Lifetimes.', PAGE),
      reader.read('Lifetimes.', PAGE),
    ]);
    const again = await reader.read('Lifetimes.', {});

    expect(first).toEqual(second);
    expect(again).toEqual(first);
    expect(calls).toHaveLength(1);
  });

  it('keeps at most a few dozen gists, letting the oldest go', async () => {
    const { provider, calls } = model();
    const reader = createPageReader({ provider: () => provider });
    for (let i = 0; i <= MAX_GISTS; i++) await reader.read(`page ${i}`, PAGE);
    await reader.read('page 1', PAGE); // still known, and now the newest

    expect(calls).toHaveLength(MAX_GISTS + 1);
    await reader.read('page 0', PAGE);
    expect(calls).toHaveLength(MAX_GISTS + 2);
  });

  it('forgets every gist, and drops what it was reading', async () => {
    let finish: (result: AiResult) => void = () => {};
    const provider: AiProvider = {
      answer: vi.fn(
        () =>
          new Promise<AiResult>((resolve) => {
            finish = resolve;
          }),
      ),
    };
    const reader = createPageReader({ provider: () => provider, timeoutMs: 1_000 });
    const reading = reader.read('Lifetimes.', PAGE);
    reader.forget();
    finish({ ok: true, text: GIST });

    expect(await reading).toBeUndefined();
    const again = reader.read('Lifetimes.', PAGE);
    finish({ ok: true, text: GIST });
    expect(await again).toMatchObject({ topic: 'Rust lifetimes' });
    expect(provider.answer).toHaveBeenCalledTimes(2);
  });
});
