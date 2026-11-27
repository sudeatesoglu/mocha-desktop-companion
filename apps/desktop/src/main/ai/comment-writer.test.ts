import type { Prompt } from '@mocha/core';
import { describe, expect, it, vi } from 'vitest';
import type { AiProvider, AiResult } from './ai-provider.ts';
import { writeComment } from './comment-writer.ts';

const CONTEXT = { kind: 'code' as const, site: 'github.com', title: 'Borrow checker errors' };
const answering = (result: AiResult) => {
  const answer = vi.fn(async (_prompt: Prompt, _options?: { signal?: AbortSignal }) => result);
  return { provider: { answer } as AiProvider, answer };
};

describe('writeComment', () => {
  it('lets the model write one clean line about the page', async () => {
    const { provider, answer } = answering({
      ok: true,
      text: '"Borrow checker again? 🦀🦀 I’d bite it."',
    });

    expect(await writeComment(provider, CONTEXT, 'fixed')).toBe(
      'Borrow checker again? 🦀 I’d bite it.',
    );
    const [prompt, options] = answer.mock.calls[0] as [Prompt, { signal?: AbortSignal }];
    const data = JSON.parse(prompt.system.split('\n').at(-1) as string);
    expect(data).toEqual({ browsing: CONTEXT });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('keeps a long comment short', async () => {
    const { provider } = answering({ ok: true, text: 'word '.repeat(60) });

    expect((await writeComment(provider, CONTEXT, 'fixed')).length).toBeLessThanOrEqual(90);
  });

  it.each([
    ['there is no model', undefined],
    ['the model is missing', 'no model' as const],
    ['the model fails', answering({ ok: false, problem: 'timeout' }).provider],
    ['the model says nothing', answering({ ok: true, text: '  ' }).provider],
  ])('says the fixed line when %s', async (_, provider) => {
    expect(await writeComment(provider, CONTEXT, 'Another bug? I’d eat it.')).toBe(
      'Another bug? I’d eat it.',
    );
  });

  it('gives up on a slow model', async () => {
    const provider: AiProvider = {
      answer: (_prompt, options) =>
        new Promise((resolve) => {
          options?.signal?.addEventListener('abort', () =>
            resolve({ ok: false, problem: 'timeout' }),
          );
        }),
    };

    expect(await writeComment(provider, CONTEXT, 'fixed', 10)).toBe('fixed');
  });
});
