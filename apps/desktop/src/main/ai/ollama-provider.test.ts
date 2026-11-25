import { describe, expect, it, vi } from 'vitest';
import { createOllamaProvider, OLLAMA_URL, ollamaModels } from './ollama-provider.ts';

const PROMPT = {
  system: 'You are Mocha.',
  turns: [{ role: 'user' as const, content: 'hi' }],
  maxTokens: 50,
};
const ndjson = (...events: object[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        const text = events.map((event) => JSON.stringify(event)).join('\n');
        const middle = Math.floor(text.length / 2);
        controller.enqueue(new TextEncoder().encode(text.slice(0, middle)));
        controller.enqueue(new TextEncoder().encode(`${text.slice(middle)}\n\n`));
        controller.close();
      },
    }),
  );

describe('ollamaModels', () => {
  it('lists the installed models, sorted, from Ollama on this computer', async () => {
    const fetch = vi.fn(async () =>
      Response.json({ models: [{ name: 'mistral:7b' }, { name: 'llama3.2' }, { size: 1 }] }),
    );

    expect(await ollamaModels(fetch)).toEqual(['llama3.2', 'mistral:7b']);
    expect(fetch).toHaveBeenCalledWith(`${OLLAMA_URL}/api/tags`, expect.anything());
  });

  it('is null when Ollama does not answer, or answers oddly', async () => {
    expect(await ollamaModels(async () => Promise.reject(new TypeError('refused')))).toBeNull();
    expect(await ollamaModels(async () => new Response('', { status: 500 }))).toBeNull();
    expect(await ollamaModels(async () => Response.json({}))).toEqual([]);
  });
});

describe('createOllamaProvider', () => {
  it('sends the persona and the turns, and streams the answer piece by piece', async () => {
    const fetch = vi.fn(async () =>
      ndjson(
        { message: { content: 'Caw' } },
        { message: { content: '! Hello.' } },
        { message: { content: '' }, done: true },
      ),
    );
    const pieces: string[] = [];

    const result = await createOllamaProvider(fetch, 'mistral:7b').answer(PROMPT, {
      onText: (piece) => pieces.push(piece),
    });

    expect(result).toEqual({ ok: true, text: 'Caw! Hello.' });
    expect(pieces).toEqual(['Caw', '! Hello.']);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${OLLAMA_URL}/api/chat`);
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'mistral:7b',
      messages: [
        { role: 'system', content: 'You are Mocha.' },
        { role: 'user', content: 'hi' },
      ],
      stream: true,
      options: { num_predict: 50 },
    });
  });

  it.each([
    ['nothing answers', async () => Promise.reject(new TypeError('refused')), 'not running'],
    [
      'it times out',
      async () => Promise.reject(new DOMException('slow', 'TimeoutError')),
      'timeout',
    ],
    ['the model is missing', async () => new Response('{}', { status: 404 }), 'no model'],
    ['it fails', async () => new Response('', { status: 500 }), 'unavailable'],
    ['it reports an error mid-way', async () => ndjson({ error: 'out of memory' }), 'unavailable'],
    ['it sends garbage', async () => new Response('not json\n'), 'unavailable'],
  ] as const)('says why when %s', async (_, fetch, problem) => {
    expect(await createOllamaProvider(fetch, 'm').answer(PROMPT)).toEqual({ ok: false, problem });
  });

  it('reports a timeout while streaming as a timeout', async () => {
    const fetch = async () =>
      new Response(
        new ReadableStream({
          pull() {
            throw new DOMException('slow', 'TimeoutError');
          },
        }),
      );

    expect(await createOllamaProvider(fetch, 'm').answer(PROMPT)).toEqual({
      ok: false,
      problem: 'timeout',
    });
  });
});
