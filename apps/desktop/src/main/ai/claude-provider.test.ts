import { describe, expect, it, vi } from 'vitest';
import { CLAUDE_URL, createClaudeProvider } from './claude-provider.ts';

const KEY = 'sk-ant-test-0123456789abcdefghij';
const PROMPT = {
  system: 'You are Mocha.',
  turns: [{ role: 'user' as const, content: 'hi' }],
  maxTokens: 50,
};
const sse = (...events: object[]) =>
  new Response(
    events
      .map(
        (event) => `event: ${(event as { type: string }).type}\ndata: ${JSON.stringify(event)}\n\n`,
      )
      .join(''),
  );

describe('createClaudeProvider', () => {
  it('sends the persona, the turns and the key to Anthropic only, and streams the answer', async () => {
    const fetch = vi.fn(async () =>
      sse(
        { type: 'message_start' },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Caw' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: ', hi!' } },
        { type: 'message_stop' },
      ),
    );
    const pieces: string[] = [];

    const result = await createClaudeProvider(fetch, KEY, 'claude-haiku-5-5').answer(PROMPT, {
      onText: (piece) => pieces.push(piece),
    });

    expect(result).toEqual({ ok: true, text: 'Caw, hi!' });
    expect(pieces).toEqual(['Caw', ', hi!']);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(CLAUDE_URL);
    expect(init.headers).toMatchObject({ 'x-api-key': KEY, 'anthropic-version': '2023-06-01' });
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'claude-haiku-5-5',
      max_tokens: 50,
      system: 'You are Mocha.',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
    });
  });

  it.each([
    ['the key is refused', 401, 'wrong key'],
    ['the key may not do this', 403, 'wrong key'],
    ['the model does not exist', 404, 'no model'],
    ['there are too many requests', 429, 'busy'],
    ['it is overloaded', 529, 'busy'],
    ['it fails', 500, 'unavailable'],
  ] as const)('says why when %s', async (_, status, problem) => {
    const fetch = async () => new Response('{}', { status });

    expect(await createClaudeProvider(fetch, KEY, 'claude-haiku-5-5').answer(PROMPT)).toEqual({
      ok: false,
      problem,
    });
  });

  it.each([
    ['nothing answers', async () => Promise.reject(new TypeError('offline')), 'unavailable'],
    [
      'it times out',
      async () => Promise.reject(new DOMException('slow', 'TimeoutError')),
      'timeout',
    ],
    [
      'it is overloaded mid-way',
      async () => sse({ type: 'error', error: { type: 'overloaded_error' } }),
      'busy',
    ],
    [
      'it fails mid-way',
      async () => sse({ type: 'error', error: { type: 'api_error' } }),
      'unavailable',
    ],
    ['it sends garbage', async () => new Response('data: {oops\n'), 'unavailable'],
  ] as const)('says why when %s', async (_, fetch, problem) => {
    expect(await createClaudeProvider(fetch, KEY, 'claude-haiku-5-5').answer(PROMPT)).toEqual({
      ok: false,
      problem,
    });
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

    expect(await createClaudeProvider(fetch, KEY, 'claude-haiku-5-5').answer(PROMPT)).toEqual({
      ok: false,
      problem: 'timeout',
    });
  });
});
