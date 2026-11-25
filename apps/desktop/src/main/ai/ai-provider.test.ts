import { describe, expect, it } from 'vitest';
import { fetchProblem, lines, withTimeout } from './ai-provider.ts';

const stream = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });

describe('lines', () => {
  it('yields whole lines across chunks, without carriage returns, and the last one', async () => {
    const got: string[] = [];
    for await (const line of lines(stream('one\r\ntw', 'o\nthr', 'ee'))) got.push(line);

    expect(got).toEqual(['one', 'two', 'three']);
  });

  it('keeps characters split across chunks whole', async () => {
    const bytes = new TextEncoder().encode('Kuzgun ğ\n');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 8));
        controller.enqueue(bytes.slice(8));
        controller.close();
      },
    });
    const got: string[] = [];
    for await (const line of lines(body)) got.push(line);

    expect(got).toEqual(['Kuzgun ğ']);
  });
});

describe('fetchProblem', () => {
  it('tells a timeout from nothing answering', () => {
    expect(fetchProblem(new DOMException('slow', 'TimeoutError'))).toBe('timeout');
    expect(fetchProblem(new TypeError('fetch failed'))).toBe('not running');
    expect(fetchProblem('odd')).toBe('not running');
  });
});

describe('withTimeout', () => {
  it('aborts with the caller, or on its own after the time', async () => {
    const caller = new AbortController();
    const both = withTimeout(caller.signal, 10_000);
    caller.abort();
    expect(both.aborted).toBe(true);

    const alone = withTimeout(undefined, 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(alone.aborted).toBe(true);
  });
});
